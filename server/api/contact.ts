import type { Env } from '../env';

interface ContactForm {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  /** Honeypot: real visitors never fill this hidden field. */
  website?: string;
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

  const text = `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`;
  try {
    if (env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: env.CONTACT_FROM_EMAIL || 'Palm Readings AI <website@palmreadings.ai>',
          to: [env.CONTACT_TO_EMAIL || 'hello@palmreadings.ai'],
          reply_to: email,
          subject: `[palmreadings.ai] ${subject}`,
          text,
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    } else if (env.CONTACT_WEBHOOK_URL) {
      const res = await fetch(env.CONTACT_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({ tab: 'Contact', timestamp: new Date().toISOString(), name, email, subject, message }),
      });
      if (!res.ok) throw new Error(`Webhook ${res.status}`);
    } else {
      console.log('Contact form (no delivery configured):', text);
    }
  } catch (e) {
    console.error('Contact delivery failed:', e);
    return Response.json({ error: 'Your message could not be sent. Please email hello@palmreadings.ai.' }, { status: 502 });
  }
  return new Response(null, { status: 204 });
}
