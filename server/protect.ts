// Bot protection (Cloudflare Turnstile) and rate limiting for the public POST endpoints.
import type { Env } from './env';

// ---------- Turnstile ----------

/** Returns null if the token is valid (or Turnstile isn't configured), else an error message. */
export async function verifyTurnstile(env: Env, token: unknown, ip: string | null): Promise<string | null> {
  if (!env.TURNSTILE_SECRET_KEY) return null; // not configured (local dev)
  if (typeof token !== 'string' || !token) return 'Please complete the security check and try again.';
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (data.success) return null;
    console.warn('Turnstile rejected:', data['error-codes']);
  } catch (e) {
    console.error('Turnstile verification failed:', e);
  }
  return 'The security check failed. Please refresh the page and try again.';
}

// ---------- Rate limits ----------

export interface Limit {
  /** Counter name, e.g. "reading:ip". */
  name: string;
  window: 'hour' | 'day';
  max: number;
  /** Message shown when the limit is hit. */
  message: string;
}

export const READING_LIMITS = (env: Env): Limit[] => [
  { name: 'reading:ip', window: 'hour', max: num(env.READINGS_PER_HOUR_PER_IP, 5), message: 'You’ve started several readings in the last hour. Please try again a little later.' },
  { name: 'reading:ip', window: 'day', max: num(env.READINGS_PER_DAY_PER_IP, 15), message: 'You’ve reached today’s limit for readings. Please come back tomorrow.' },
  { name: 'reading:all', window: 'day', max: num(env.READINGS_PER_DAY_TOTAL, 500), message: 'We’re receiving a lot of readings right now. Please try again later today.' },
];

export const CONTACT_LIMITS: Limit[] = [
  { name: 'contact:ip', window: 'hour', max: 5, message: 'You’ve sent several messages already. Please try again later or email us directly.' },
];

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** The visitor's IP as set by Cloudflare's edge (clients can't spoof this header in production). */
export function clientIp(request: Request): string | null {
  return request.headers.get('cf-connecting-ip');
}

const isLocal = (request: Request) => ['localhost', '127.0.0.1', '0.0.0.0'].includes(new URL(request.url).hostname);

function windowId(window: 'hour' | 'day', now: Date): string {
  const iso = now.toISOString();
  return window === 'hour' ? `h:${iso.slice(0, 13)}` : `d:${iso.slice(0, 10)}`;
}

/**
 * Counts this request against each limit. Returns the message of the first limit exceeded,
 * or null if the request is allowed. IP addresses are hashed with a secret salt before storage.
 */
export async function checkLimits(env: Env, request: Request, limits: Limit[], now = new Date()): Promise<string | null> {
  // Skip on localhost so local testing isn't blocked, unless explicitly enabled.
  if (isLocal(request) && env.ENFORCE_LIMITS_LOCALLY !== 'true') return null;
  const ip = clientIp(request) ?? 'unknown';
  const ipHash = await sha256(`${env.RATE_LIMIT_SALT ?? 'palmreadings'}:${ip}`);
  const keyed = limits.map((l) => ({ ...l, key: l.name.endsWith(':ip') ? `${l.name}:${ipHash}` : l.name, win: windowId(l.window, now) }));

  const stmt = env.DB.prepare(
    `INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1)
     ON CONFLICT (key, window) DO UPDATE SET count = count + 1
     RETURNING count`,
  );
  const results = await env.DB.batch<{ count: number }>(keyed.map((l) => stmt.bind(l.key, l.win)));
  for (let i = 0; i < keyed.length; i++) {
    if ((results[i].results[0]?.count ?? 0) > keyed[i].max) return keyed[i].message;
  }
  return null;
}

/** Deletes counters older than two days. Called from the daily cron. */
export async function purgeRateLimits(env: Env, now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  await env.DB.prepare(`DELETE FROM rate_limits WHERE substr(window, 3, 10) < ?`).bind(cutoff).run();
}
