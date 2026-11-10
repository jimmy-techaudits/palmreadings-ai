import { handleContact } from '../server/api/contact';
import { handleFeedback } from '../server/api/feedback';
import { handleReading } from '../server/api/reading';
import type { Env } from '../server/env';

const API: Record<string, (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>> = {
  '/api/reading': handleReading,
  '/api/feedback': handleFeedback,
  '/api/contact': handleContact,
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    // The old app subdomain and www both point to the single site.
    if (url.hostname === 'app.palmreadings.ai') {
      return Response.redirect(`https://palmreadings.ai/reading/${url.search}`, 301);
    }
    if (url.hostname === 'www.palmreadings.ai') {
      return Response.redirect(`https://palmreadings.ai${url.pathname}${url.search}`, 301);
    }

    const handler = API[url.pathname];
    if (handler) {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
      return handler(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/')) return Response.json({ error: 'Not found' }, { status: 404 });

    // Old WordPress URLs with no equivalent.
    if (url.pathname.startsWith('/uncategorized/') || url.pathname.startsWith('/wp-')) {
      return Response.redirect(`${url.origin}/`, 301);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
