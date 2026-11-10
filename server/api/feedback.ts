import { READING_ID_RE } from '../../shared/types';
import type { Env } from '../env';
import { saveFeedback } from '../store';

interface Feedback {
  rating: 1 | -1;
  comment?: string;
  mode?: string;
  focus?: string;
  readingId?: string;
}

export async function handleFeedback(request: Request, env: Env): Promise<Response> {
  let body: Feedback;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (body.rating !== 1 && body.rating !== -1) return Response.json({ error: 'Invalid rating' }, { status: 400 });

  const payload = {
    tab: 'Feedback',
    timestamp: new Date().toISOString(),
    rating: body.rating,
    comment: String(body.comment ?? '').slice(0, 2000),
    mode: String(body.mode ?? '').slice(0, 20),
    focus: String(body.focus ?? '').slice(0, 20),
  };
  if (body.readingId && READING_ID_RE.test(body.readingId)) {
    await saveFeedback(env, body.readingId, body.rating, payload.comment).catch((e) => console.error('Feedback save failed:', e));
  }
  if (env.FEEDBACK_WEBHOOK_URL) {
    await fetch(env.FEEDBACK_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(payload) }).catch((e) =>
      console.error('Feedback forward failed:', e),
    );
  } else {
    console.log('Feedback:', JSON.stringify(payload));
  }
  return new Response(null, { status: 204 });
}
