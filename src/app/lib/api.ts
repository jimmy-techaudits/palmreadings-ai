import type { CheckoutStatus, Focus, Mode, ReadingRequest, SavedReadingData, SiteConfig, StreamEvent } from '../../../shared/types';

export class ApiError extends Error {
  /** Machine-readable reason from the server, e.g. "free_used", "payment_required", "writing". */
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/** Reads a newline-delimited JSON stream of events until a final event (reading, photo issues or error). */
async function readStream(res: Response, onEvent: (e: StreamEvent) => void) {
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error || `The reading service returned an error (${res.status}).`, body?.code);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const event = JSON.parse(line) as StreamEvent;
      if (event.type === 'reading' || event.type === 'photo_issues' || event.type === 'error') finished = true;
      onEvent(event);
    }
  }
  if (!finished) throw new ApiError('The connection was interrupted. Please try again.');
}

/** Posts a reading request and calls onEvent for each streamed event. */
export async function requestReading(req: ReadingRequest, onEvent: (e: StreamEvent) => void, signal?: AbortSignal) {
  const res = await fetch('/api/reading', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  await readStream(res, onEvent);
}

/** Writes the paid part of a preview (once paid), streamed like a new reading. */
export async function unlockReading(id: string, checkout: string | undefined, onEvent: (e: StreamEvent) => void) {
  const res = await fetch(`/api/readings/${encodeURIComponent(id)}/unlock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ checkout }),
  });
  await readStream(res, onEvent);
}

export async function fetchConfig(): Promise<SiteConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new ApiError('We could not load prices. Please refresh the page.');
  return res.json();
}

/** Starts a Stripe Checkout and sends the browser to it. */
export async function startCheckout(body: { kind: 'reading' | 'unlock'; mode: Mode; focus: Focus; readingId?: string }): Promise<void> {
  const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) throw new ApiError(data?.error || 'We could not start the checkout. Please try again.');
  window.location.assign(data.url);
}

export async function checkoutStatus(sessionId: string): Promise<CheckoutStatus | null> {
  const res = await fetch(`/api/checkout/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return null;
  return res.json();
}

/** "$4.99" from 499 cents. */
export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function sendFeedback(body: { rating: 1 | -1; comment: string; mode: string; focus: string; readingId?: string }) {
  return fetch('/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

export function track(event: string, params: Record<string, string | boolean>) {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('event', event, params);
}

export async function fetchSavedReading(id: string): Promise<SavedReadingData | null> {
  const res = await fetch(`/api/readings/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError('We could not load this reading. Please try again.');
  return res.json();
}

export async function deleteSavedReading(id: string): Promise<void> {
  const res = await fetch(`/api/readings/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new ApiError('We could not delete this reading. Please try again.');
}

export const photoUrl = (id: string, slot: string) => `/api/readings/${encodeURIComponent(id)}/photos/${slot}`;

export async function updateMarketingConsent(id: string, marketingConsent: boolean): Promise<void> {
  const res = await fetch(`/api/readings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ marketingConsent }),
  });
  if (!res.ok) throw new ApiError('We could not save your choice. Please try again.');
}
