// Purchases, the free-reading allowance, the visitor cookie and email subscribers (all in D1).
import { DEFAULT_PRICES, EMAIL_CONSENT_TEXT } from '../shared/business';
import type { Focus, Mode } from '../shared/types';
import type { Env } from './env';
import { clientIp, isLocal, sha256 } from './protect';
import { getCheckout, paymentsMode } from './stripe';

// ---------- Prices ----------

export function prices(env: Env): { solo: number; couple: number } {
  const cents = (v: string | undefined, d: number) => (Number(v) > 0 ? Math.round(Number(v)) : d);
  return { solo: cents(env.PRICE_SOLO_CENTS, DEFAULT_PRICES.solo), couple: cents(env.PRICE_COUPLE_CENTS, DEFAULT_PRICES.couple) };
}

// ---------- Visitor cookie ----------

const VISITOR_COOKIE = 'pr_vid';
const VISITOR_RE = /^[A-Za-z0-9_-]{20,40}$/;

/** The visitor id from the long-lived cookie, if any. */
export function visitorId(request: Request): string | null {
  const m = (request.headers.get('cookie') ?? '').match(/(?:^|;\s*)pr_vid=([^;]+)/);
  return m && VISITOR_RE.test(m[1]) ? m[1] : null;
}

/** Returns the visitor id, and a Set-Cookie header when a new one had to be made. */
export function ensureVisitor(request: Request): { id: string; setCookie: string | null } {
  const existing = visitorId(request);
  if (existing) return { id: existing, setCookie: null };
  const id = crypto.randomUUID().replace(/-/g, '');
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return { id, setCookie: `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=63072000; SameSite=Lax; HttpOnly${secure}` };
}

// ---------- Free reading allowance ----------

const YEAR_MS = 365 * 86_400_000;

async function claimKey(env: Env, kind: 'v' | 'e' | 'ip', value: string): Promise<string> {
  return `${kind}:${await sha256(`${env.RATE_LIMIT_SALT ?? 'palmreadings'}:${kind}:${value.toLowerCase()}`)}`;
}

async function claimKeys(env: Env, request: Request, visitor: string | null, email?: string): Promise<{ v?: string; e?: string; ip?: string }> {
  const ip = clientIp(request);
  return {
    v: visitor ? await claimKey(env, 'v', visitor) : undefined,
    e: email ? await claimKey(env, 'e', email) : undefined,
    ip: ip ? await claimKey(env, 'ip', ip) : undefined,
  };
}

/**
 * One free reading per visitor: recognized by email if given, else the visitor cookie, with the IP
 * address as a backstop (a few per IP a year, for shared networks). Skipped on localhost unless
 * ENFORCE_LIMITS_LOCALLY=true.
 */
export async function freeAvailable(env: Env, request: Request, visitor: string | null, email?: string, now = Date.now()): Promise<boolean> {
  if (isLocal(request) && env.ENFORCE_LIMITS_LOCALLY !== 'true') return true;
  const keys = await claimKeys(env, request, visitor, email);
  const list = [keys.v, keys.e, keys.ip].filter((k): k is string => !!k);
  if (!list.length) return true;
  const since = new Date(now - YEAR_MS).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT key, COUNT(*) AS n FROM free_claims WHERE key IN (${list.map(() => '?').join(',')}) AND created_at > ? GROUP BY key`,
  )
    .bind(...list, since)
    .all<{ key: string; n: number }>();
  const count = (k?: string) => results.find((r) => r.key === k)?.n ?? 0;
  const perIp = Number(env.FREE_READINGS_PER_IP) > 0 ? Number(env.FREE_READINGS_PER_IP) : 3;
  return count(keys.v) === 0 && count(keys.e) === 0 && count(keys.ip) < perIp;
}

export async function recordFreeClaim(env: Env, request: Request, visitor: string, email: string | undefined, readingId: string) {
  const keys = await claimKeys(env, request, visitor, email);
  const now = new Date().toISOString();
  const stmt = env.DB.prepare('INSERT INTO free_claims (key, reading_id, created_at) VALUES (?, ?, ?)');
  await env.DB.batch([keys.v, keys.e, keys.ip].filter((k): k is string => !!k).map((k) => stmt.bind(k, readingId, now)));
}

/** Free-reading records older than a year are no longer needed. Called from the daily cron. */
export async function purgeFreeClaims(env: Env, now = Date.now()): Promise<void> {
  await env.DB.prepare('DELETE FROM free_claims WHERE created_at < ?').bind(new Date(now - YEAR_MS).toISOString()).run();
}

// ---------- Purchases ----------

export interface Purchase {
  session_id: string;
  kind: 'reading' | 'unlock';
  mode: Mode;
  focus: Focus;
  reading_id: string | null;
  amount_cents: number;
  success_url: string;
  email: string | null;
  paid_at: string | null;
  used_at: string | null;
}

export async function createPurchase(env: Env, p: Omit<Purchase, 'paid_at' | 'used_at' | 'email'>) {
  await env.DB.prepare(
    `INSERT INTO purchases (session_id, created_at, kind, mode, focus, reading_id, amount_cents, success_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(p.session_id, new Date().toISOString(), p.kind, p.mode, p.focus, p.reading_id, p.amount_cents, p.success_url)
    .run();
}

export async function getPurchase(env: Env, sessionId: string): Promise<Purchase | null> {
  return env.DB.prepare('SELECT * FROM purchases WHERE session_id = ?').bind(sessionId).first<Purchase>();
}

/** Records a payment (from the webhook, a return from checkout, or the local mock). */
export async function markPaid(env: Env, sessionId: string, email: string | null): Promise<Purchase | null> {
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE purchases SET paid_at = COALESCE(paid_at, ?), email = COALESCE(email, ?) WHERE session_id = ?').bind(now, email, sessionId).run();
  const p = await getPurchase(env, sessionId);
  if (p?.kind === 'unlock' && p.reading_id) {
    await env.DB.prepare('UPDATE readings SET paid_at = COALESCE(paid_at, ?), amount_cents = ? WHERE id = ?').bind(now, p.amount_cents, p.reading_id).run();
  }
  return p;
}

/**
 * The purchase, with its payment confirmed against Stripe if the webhook hasn't arrived yet.
 * Null if unknown or not paid.
 */
export async function confirmPaid(env: Env, request: Request, sessionId: string): Promise<Purchase | null> {
  if (!/^(cs_(test|live)_|mock_)[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const p = await getPurchase(env, sessionId);
  if (!p) return null;
  if (p.paid_at) return p;
  if (paymentsMode(env, request) !== 'stripe' || sessionId.startsWith('mock_')) return null;
  const s = await getCheckout(env, sessionId);
  return s.paid ? markPaid(env, sessionId, s.email) : null;
}

/** A paid-up-front purchase makes one reading. Returns false if it was already used. */
export async function markUsed(env: Env, sessionId: string, readingId: string): Promise<boolean> {
  const res = await env.DB.prepare('UPDATE purchases SET used_at = ?, reading_id = ? WHERE session_id = ? AND used_at IS NULL')
    .bind(new Date().toISOString(), readingId, sessionId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

// ---------- Subscribers ----------

/** Adds (or re-subscribes) an email with the consent wording and time. Returns its unsubscribe token. */
export async function addSubscriber(env: Env, email: string, readingId: string): Promise<string> {
  const now = new Date().toISOString();
  const token = crypto.randomUUID().replace(/-/g, '');
  const row = await env.DB.prepare(
    `INSERT INTO subscribers (email, created_at, consent_text, consent_at, source, first_reading_id, unsubscribe_token)
     VALUES (?, ?, ?, ?, 'free_reading', ?, ?)
     ON CONFLICT (email) DO UPDATE SET consent_text = excluded.consent_text, consent_at = excluded.consent_at, unsubscribed_at = NULL
     RETURNING unsubscribe_token`,
  )
    .bind(email.toLowerCase(), now, EMAIL_CONSENT_TEXT, now, readingId, token)
    .first<{ unsubscribe_token: string }>();
  return row?.unsubscribe_token ?? token;
}

/** Returns the email that was unsubscribed, or null if the token is unknown. */
export async function unsubscribe(env: Env, token: string): Promise<string | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const row = await env.DB.prepare('UPDATE subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, ?) WHERE unsubscribe_token = ? RETURNING email')
    .bind(new Date().toISOString(), token)
    .first<{ email: string }>();
  return row?.email ?? null;
}
