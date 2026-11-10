import type { ReadingRequest, SavedReadingData, StreamEvent } from '../../../shared/types';

export class ApiError extends Error {}

/** Posts a reading request and calls onEvent for each streamed event. */
export async function requestReading(req: ReadingRequest, onEvent: (e: StreamEvent) => void, signal?: AbortSignal) {
  const res = await fetch('/api/reading', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error || `The reading service returned an error (${res.status}).`);
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
