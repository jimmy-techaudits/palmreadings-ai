import type { ReadingRequest, StreamEvent } from '../../shared/types';
import type { Env } from '../env';
import { runReading } from '../pipeline';
import { getProvider } from '../providers';
import { validateRequest } from '../validate';
import { saveReading } from '../store';

const MAX_BODY_BYTES = 12_000_000;

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

  let provider;
  try {
    provider = getProvider(env);
  } catch (e) {
    console.error('Provider setup failed:', e);
    return Response.json({ error: 'The reading service is not configured yet.' }, { status: 503 });
  }

  // Anonymous usage event, forwarded server-side (no names, ages or photos).
  if (env.USAGE_WEBHOOK_URL) {
    waitUntil(
      fetch(env.USAGE_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({
          tab: 'Usage',
          timestamp: new Date().toISOString(),
          mode: body.mode,
          focus: body.focus,
          includeFamily: body.includeFamily,
          photoCount: body.photos.length,
          provider: provider.name,
        }),
      }).catch(() => {}),
    );
  }

  // Newline-delimited JSON stream: progress events keep the connection alive
  // during the two model calls and let the UI show each stage.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const emit = (e: StreamEvent) => writer.write(enc.encode(JSON.stringify(e) + '\n')).catch(() => {});

  waitUntil(
    (async () => {
      try {
        await runReading(body, provider, emit, (reading, observations) =>
          saveReading(env, body, reading, observations, provider.name),
        );
      } catch (e) {
        console.error('Reading failed:', e);
        emit({ type: 'error', message: 'We could not finish your reading. Please try again in a moment.' });
      } finally {
        await writer.close().catch(() => {});
      }
    })(),
  );

  return new Response(readable, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}
