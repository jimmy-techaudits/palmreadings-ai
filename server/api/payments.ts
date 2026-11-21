// GET /api/config, POST /api/checkout, GET /api/checkout/:id, GET /api/checkout/mock/:id,
// POST /api/stripe/webhook, POST /api/readings/:id/unlock, GET|POST /api/unsubscribe.
import { FOCUS_LABELS } from '../../shared/plan';
import { READING_ID_RE, type CheckoutStatus, type Focus, type Mode, type SiteConfig, type StreamEvent } from '../../shared/types';
import { logSubscriber, sendPaidReadingEmail } from '../email';
import type { Env } from '../env';
import { confirmPaid, createPurchase, ensureVisitor, freeAvailable, getPurchase, markPaid, prices, unsubscribe } from '../payments';
import { writeFull } from '../pipeline';
import { getProvider } from '../providers';
import { clearWriting, getReading, saveFullReading, startWritingFull } from '../store';
import { createCheckout, paymentsMode, verifyWebhook } from '../stripe';

const NO_STORE = { 'cache-control': 'no-store' };

/** GET /api/config: prices, whether this visitor's free reading is still available, and the payment mode. */
export async function handleConfig(request: Request, env: Env): Promise<Response> {
  const visitor = ensureVisitor(request);
  const body: SiteConfig = {
    prices: prices(env),
    freeAvailable: await freeAvailable(env, request, visitor.setCookie ? null : visitor.id),
    payments: paymentsMode(env, request),
  };
  const headers: Record<string, string> = { ...NO_STORE };
  if (visitor.setCookie) headers['set-cookie'] = visitor.setCookie;
  return Response.json(body, { headers });
}

const READING_TYPE: Record<string, string> = { 'solo:overall': 'full', 'solo:love': 'love', 'solo:career': 'career', 'couple:overall': 'couples' };

/** POST /api/checkout {kind, mode, focus, readingId?}: starts a Stripe Checkout and returns its URL. */
export async function handleCheckout(request: Request, env: Env): Promise<Response> {
  if (paymentsMode(env, request) === 'off') return Response.json({ error: 'Payments are not set up yet.' }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { kind?: string; mode?: string; focus?: string; readingId?: string } | null;
  const kind = body?.kind;
  const mode = body?.mode as Mode;
  const focus = (body?.focus ?? 'overall') as Focus;
  if ((kind !== 'reading' && kind !== 'unlock') || (mode !== 'solo' && mode !== 'couple') || !(focus in FOCUS_LABELS)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const origin = new URL(request.url).origin;
  const amount = prices(env)[mode];
  let successUrl: string;
  let cancelUrl: string;
  let readingId: string | null = null;

  if (kind === 'unlock') {
    if (!body?.readingId || !READING_ID_RE.test(body.readingId)) return Response.json({ error: 'Invalid reading' }, { status: 400 });
    const data = await getReading(env, body.readingId);
    if (!data) return Response.json({ error: 'Reading not found' }, { status: 404 });
    if (data.tier === 'full' || data.paidAt) return Response.json({ error: 'This reading is already unlocked.' }, { status: 409 });
    readingId = data.id;
    successUrl = `${origin}/r/${data.id}/?checkout={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${origin}/r/${data.id}/`;
  } else {
    const type = READING_TYPE[`${mode}:${mode === 'couple' ? 'overall' : focus}`] ?? 'full';
    successUrl = `${origin}/reading/?checkout={CHECKOUT_SESSION_ID}&type=${type}`;
    cancelUrl = `${origin}/reading/?type=${type}`;
  }

  const name = mode === 'couple' ? 'Couples palm reading' : `Full palm reading: ${FOCUS_LABELS[focus]}`;
  const session = await createCheckout(env, request, {
    amountCents: amount,
    name,
    description: kind === 'unlock' ? 'Unlocks the rest of your palm reading.' : 'A complete palm reading from photos of your hands.',
    successUrl,
    cancelUrl,
    metadata: { kind, mode, focus, reading_id: readingId ?? '' },
  });
  await createPurchase(env, { session_id: session.id, kind, mode, focus, reading_id: readingId, amount_cents: amount, success_url: successUrl });
  return Response.json({ url: session.url }, { headers: NO_STORE });
}

/** GET /api/checkout/:id: whether a checkout was paid (confirmed with Stripe if needed). */
export async function handleCheckoutStatus(request: Request, env: Env, id: string): Promise<Response> {
  const known = await getPurchase(env, id);
  if (!known) return Response.json({ error: 'Not found' }, { status: 404 });
  const p = (await confirmPaid(env, request, id)) ?? known;
  const body: CheckoutStatus = { paid: !!p.paid_at, used: !!p.used_at, kind: p.kind, mode: p.mode, readingId: p.reading_id };
  return Response.json(body, { headers: NO_STORE });
}

/** GET /api/checkout/mock/:id: local testing only. Marks the checkout paid and returns to the site. */
export async function handleMockCheckout(request: Request, env: Env, id: string): Promise<Response> {
  if (paymentsMode(env, request) !== 'mock' || !id.startsWith('mock_')) return new Response('Not found', { status: 404 });
  const p = await markPaid(env, id, null);
  if (!p) return new Response('Not found', { status: 404 });
  return Response.redirect(p.success_url.replace('{CHECKOUT_SESSION_ID}', id), 303);
}

/** POST /api/stripe/webhook: records payments even if the buyer never returns to the site. */
export async function handleStripeWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const payload = await request.text();
  const event = await verifyWebhook(env, payload, request.headers.get('stripe-signature'));
  if (!event) return new Response('Invalid signature', { status: 400 });
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object;
    if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') {
      const p = await markPaid(env, s.id, s.customer_details?.email ?? null);
      // An unlocked preview: send its link now (a reading paid up front is emailed once it's made).
      if (p?.kind === 'unlock' && p.reading_id && p.email) {
        const link = `${new URL(request.url).origin}/r/${p.reading_id}/`;
        ctx.waitUntil(sendPaidReadingEmail(env, p.email, link).catch((e) => console.error('Paid email failed:', e)));
      }
    }
  }
  return Response.json({ received: true });
}

/**
 * POST /api/readings/:id/unlock {checkout?}: writes the paid part of a preview once it is paid for,
 * streamed like a new reading. Safe to call again: a finished reading is returned as is.
 */
export async function handleUnlock(request: Request, env: Env, ctx: ExecutionContext, id: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { checkout?: string };
  let data = await getReading(env, id);
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });

  if (data.tier === 'preview' && !data.paidAt && body.checkout) {
    const p = await confirmPaid(env, request, body.checkout);
    if (p?.kind === 'unlock' && p.reading_id === id) data = (await getReading(env, id)) ?? data;
  }
  if (data.tier === 'preview' && !data.paidAt) return Response.json({ error: 'This reading hasn’t been unlocked yet.', code: 'payment_required' }, { status: 402 });

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const emit = (e: StreamEvent) => writer.write(enc.encode(JSON.stringify(e) + '\n')).catch(() => {});
  const reading = data;

  ctx.waitUntil(
    (async () => {
      try {
        if (reading.tier === 'full') {
          emit({ type: 'reading', reading: reading.reading, id });
          return;
        }
        emit({ type: 'stage', stage: 'writing_full' });
        if (!(await startWritingFull(env, id))) {
          // Another request is already writing it (e.g. the page was refreshed): the page polls instead.
          emit({ type: 'error', message: 'Your full reading is still being written.', code: 'writing' });
          return;
        }
        try {
          const full = await writeFull(
            { mode: reading.mode, focus: reading.focus, includeFamily: reading.includeFamily, people: reading.people, curious: reading.reading.curious },
            reading.observations,
            reading.reading,
            getProvider(env),
          );
          await saveFullReading(env, id, full);
          emit({ type: 'reading', reading: full, id });
        } catch (e) {
          await clearWriting(env, id);
          throw e;
        }
      } catch (e) {
        console.error('Unlock failed:', e);
        emit({ type: 'error', message: 'We couldn’t finish your full reading. Please refresh the page to try again; you won’t be charged twice.' });
      } finally {
        await writer.close().catch(() => {});
      }
    })(),
  );
  return new Response(readable, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', ...NO_STORE } });
}

/** GET (link in emails) or POST (one-click) /api/unsubscribe?token=... */
export async function handleUnsubscribe(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const email = await unsubscribe(env, token);
  if (email) ctx.waitUntil(logSubscriber(env, email, 'unsubscribed').catch((e) => console.error('Unsubscribe log failed:', e)));
  if (request.method === 'POST') return new Response(null, { status: email ? 204 : 404 });
  const message = email ? 'You’re unsubscribed. You won’t get any more emails from us.' : 'This unsubscribe link isn’t valid. If you keep getting emails, write to hello@palmreadings.ai.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Unsubscribe | Palm Readings AI</title></head>
<body style="margin:0;background:#06060f;color:#ede7ff;font:18px/1.6 system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px">
<main style="max-width:480px;text-align:center"><p style="color:#f6c77f;letter-spacing:.2em;text-transform:uppercase;font-size:14px">Palm Readings AI</p><h1 style="font-weight:500;color:#fff">${message}</h1><p><a href="/" style="color:#f6c77f">Back to palmreadings.ai</a></p></main></body></html>`;
  return new Response(html, { status: email ? 200 : 404, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', ...NO_STORE } });
}
