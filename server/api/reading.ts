import type { ReadingRequest, StreamEvent } from '../../shared/types';
import type { Env } from '../env';
import { sendFreeReadingEmail, sendPaidReadingEmail, logSubscriber } from '../email';
import { sendToGoogle } from '../google';
import { addSubscriber, confirmPaid, ensureVisitor, freeAvailable, markUsed, recordFreeClaim, type Purchase } from '../payments';
import { runReading } from '../pipeline';
import { getProvider } from '../providers';
import { checkLimits, clientIp, READING_LIMITS, verifyTurnstile } from '../protect';
import { saveReading } from '../store';
import { validateRequest } from '../validate';
import { EMAIL_CONSENT_TEXT } from '../../shared/business';

const MAX_BODY_BYTES = 12_000_000;

const json = (body: unknown, status: number, setCookie: string | null) =>
  Response.json(body, { status, headers: setCookie ? { 'set-cookie': setCookie } : {} });

/**
 * POST /api/reading: a new reading from photos.
 * - Paid up front (`paidSession`): the whole reading is written; no bot check or limits apply.
 * - Free (solo only, one per visitor): only the preview is written; the rest is unlocked by paying later.
 */
export async function handleReading(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const waitUntil = (p: Promise<unknown>) => ctx.waitUntil(p);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: 'Request too large' }, { status: 413 });
  }
  let body: ReadingRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const invalid = validateRequest(body);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  const visitor = ensureVisitor(request);
  const email = body.email?.trim().toLowerCase() || undefined;

  let purchase: Purchase | null = null;
  if (body.paidSession) {
    purchase = await confirmPaid(env, request, body.paidSession);
    if (!purchase || purchase.kind !== 'reading' || purchase.mode !== body.mode) {
      return json({ error: 'We couldn’t find a payment for this reading. Please contact us if you were charged.', code: 'payment_invalid' }, 402, visitor.setCookie);
    }
    if (purchase.used_at) {
      return json({ error: 'This payment has already been used for a reading.', code: 'payment_used' }, 402, visitor.setCookie);
    }
  } else {
    if (body.mode === 'couple') {
      return json({ error: 'Couples readings are paid readings.', code: 'payment_required' }, 402, visitor.setCookie);
    }
    const botError = await verifyTurnstile(env, body.turnstileToken, clientIp(request));
    if (botError) return json({ error: botError }, 403, visitor.setCookie);
    if (!(await freeAvailable(env, request, visitor.setCookie ? null : visitor.id, email))) {
      return json({ error: 'You’ve already had your free reading.', code: 'free_used' }, 402, visitor.setCookie);
    }
    const limited = await checkLimits(env, request, READING_LIMITS(env));
    if (limited) return json({ error: limited }, 429, visitor.setCookie);
  }

  let provider;
  try {
    provider = getProvider(env);
  } catch (e) {
    console.error('Provider setup failed:', e);
    return json({ error: 'The reading service is not configured yet.' }, 503, visitor.setCookie);
  }

  // Anonymous usage event, logged to the Google Sheet (no names, ages or photos).
  waitUntil(
    sendToGoogle(env, 'usage', {
      mode: body.mode,
      focus: body.focus,
      includeFamily: body.includeFamily,
      curious: body.curious ?? '',
      photoCount: body.photos.length,
      provider: provider.name,
      paid: purchase ? 'paid' : 'free',
    }).catch((e) => console.error('Usage log failed:', e)),
  );

  const origin = new URL(request.url).origin;
  const paid = purchase;

  // Newline-delimited JSON stream: progress events keep the connection alive
  // during the model calls and let the UI show each stage.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const emit = (e: StreamEvent) => writer.write(enc.encode(JSON.stringify(e) + '\n')).catch(() => {});

  waitUntil(
    (async () => {
      try {
        await runReading(
          body,
          provider,
          emit,
          async (reading, observations) => {
            const id = await saveReading(env, body, reading, observations, provider.name, {
              tier: paid ? 'full' : 'preview',
              amountCents: paid ? paid.amount_cents : null,
            });
            const link = `${origin}/r/${id}/`;
            if (paid) {
              await markUsed(env, paid.session_id, id);
              if (paid.email) waitUntil(sendPaidReadingEmail(env, paid.email, link).catch((e) => console.error('Paid email failed:', e)));
            } else {
              await recordFreeClaim(env, request, visitor.id, email, id);
              if (email) {
                const token = await addSubscriber(env, email, id);
                waitUntil(
                  Promise.all([
                    sendFreeReadingEmail(env, email, link, `${origin}/api/unsubscribe?token=${token}`),
                    logSubscriber(env, email, 'subscribed', EMAIL_CONSENT_TEXT),
                  ]).catch((e) => console.error('Free reading email failed:', e)),
                );
              }
            }
            return id;
          },
          { full: !!paid },
        );
      } catch (e) {
        console.error('Reading failed:', e);
        emit({ type: 'error', message: 'We could not finish your reading. Please try again in a moment.' });
      } finally {
        await writer.close().catch(() => {});
      }
    })(),
  );

  const headers: Record<string, string> = { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' };
  if (visitor.setCookie) headers['set-cookie'] = visitor.setCookie;
  return new Response(readable, { headers });
}

