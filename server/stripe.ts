// Stripe Checkout over its REST API (no SDK needed on Workers). On localhost without a Stripe key,
// checkout is simulated by /api/checkout/mock/:id so the whole flow can be tested offline.
import type { Env } from './env';
import { isLocal } from './protect';

const API = 'https://api.stripe.com/v1';

export type PaymentsMode = 'stripe' | 'mock' | 'off';

export function paymentsMode(env: Env, request: Request): PaymentsMode {
  if (env.STRIPE_SECRET_KEY) return 'stripe';
  return isLocal(request) ? 'mock' : 'off';
}

/** Flattens {a: {b: 1}} into Stripe's form encoding: a[b]=1. */
function form(data: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe<T>(env: Env, method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: body ? form(body) : undefined,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${path}: ${json.error?.message ?? res.status}`);
  return json;
}

export interface NewCheckout {
  amountCents: number;
  name: string;
  description: string;
  /** May contain {CHECKOUT_SESSION_ID}, which Stripe fills in. */
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export async function createCheckout(env: Env, request: Request, c: NewCheckout): Promise<{ id: string; url: string }> {
  if (paymentsMode(env, request) === 'mock') {
    const id = `mock_${crypto.randomUUID().replace(/-/g, '')}`;
    return { id, url: `${new URL(request.url).origin}/api/checkout/mock/${id}` };
  }
  const session = await stripe<{ id: string; url: string }>(env, 'POST', '/checkout/sessions', {
    mode: 'payment',
    success_url: c.successUrl,
    cancel_url: c.cancelUrl,
    allow_promotion_codes: 'true',
    submit_type: 'pay',
    line_items: { 0: { quantity: 1, price_data: { currency: 'usd', unit_amount: c.amountCents, product_data: { name: c.name, description: c.description } } } },
    metadata: c.metadata,
    payment_intent_data: { description: c.name, metadata: c.metadata },
  });
  return { id: session.id, url: session.url };
}

export interface SessionInfo {
  paid: boolean;
  email: string | null;
  amountCents: number | null;
}

export async function getCheckout(env: Env, id: string): Promise<SessionInfo> {
  const s = await stripe<{ payment_status: string; customer_details?: { email?: string } | null; amount_total?: number }>(
    env,
    'GET',
    `/checkout/sessions/${encodeURIComponent(id)}`,
  );
  return {
    // "no_payment_required" when a 100% promotion code was used.
    paid: s.payment_status === 'paid' || s.payment_status === 'no_payment_required',
    email: s.customer_details?.email ?? null,
    amountCents: s.amount_total ?? null,
  };
}

export interface StripeEvent {
  type: string;
  data: { object: { id: string; payment_status?: string; customer_details?: { email?: string } | null; amount_total?: number; metadata?: Record<string, string> } };
}

/** Checks the Stripe-Signature header (HMAC-SHA256, 5 minute tolerance). Returns the event, or null if invalid. */
export async function verifyWebhook(env: Env, payload: string, header: string | null, now = Date.now()): Promise<StripeEvent | null> {
  if (!env.STRIPE_WEBHOOK_SECRET || !header) return null;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  const signatures = header
    .split(',')
    .filter((kv) => kv.startsWith('v1='))
    .map((kv) => kv.slice(3));
  if (!t || !signatures.length || Math.abs(now / 1000 - t) > 300) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const match = signatures.some((sig) => sig.length === expected.length && timingSafeEqual(sig, expected));
  return match ? (JSON.parse(payload) as StripeEvent) : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
