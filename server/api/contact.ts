import type { Env } from '../env';
import { sendToGoogle } from '../google';
import { checkLimits, clientIp, CONTACT_LIMITS, verifyTurnstile } from '../protect';

interface ContactForm {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  /** Honeypot: real visitors never fill this hidden field. */
  website?: string;
  /** Turnstile token, posted by the widget as cf-turnstile-response. */
  'cf-turnstile-response'?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleContact(request: Request, env: Env): Promise<Response> {
  let body: ContactForm;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (body.website) return new Response(null, { status: 204 }); // bot: pretend success

  const name = String(body.name ?? '').trim().slice(0, 100);
  const email = String(body.email ?? '').trim().slice(0, 200);
  const subject = String(body.subject ?? '').trim().slice(0, 150) || 'Website inquiry';
  const message = String(body.message ?? '').trim().slice(0, 5000);
  if (!name || !EMAIL_RE.test(email) || message.length < 5) {
    return Response.json({ error: 'Please fill in your name, a valid email, and a message.' }, { status: 400 });
  }

  const botError = await verifyTurnstile(env, body['cf-turnstile-response'], clientIp(request));
  if (botError) return Response.json({ error: botError }, { status: 403 });
  const limited = await checkLimits(env, request, CONTACT_LIMITS);
  if (limited) return Response.json({ error: limited }, { status: 429 });

  try {
    const sent = await sendToGoogle(env, 'contact', { name, email, subject, message });
    if (!sent) console.log('Contact form (Google Apps Script not configured):', JSON.stringify({ name, email, subject, message }));
  } catch (e) {
    console.error('Contact delivery failed:', e);
    return Response.json({ error: 'Your message could not be sent. Please email hello@palmreadings.ai.' }, { status: 502 });
  }
  return new Response(null, { status: 204 });
}
