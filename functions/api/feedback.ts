import type { Env } from '../_lib/env';

interface Feedback {
  rating: 1 | -1;
  comment?: string;
  mode?: string;
  focus?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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
  if (env.FEEDBACK_WEBHOOK_URL) {
    await fetch(env.FEEDBACK_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(payload) }).catch((e) =>
      console.error('Feedback forward failed:', e),
    );
  } else {
    console.log('Feedback:', JSON.stringify(payload));
  }
  return new Response(null, { status: 204 });
};
