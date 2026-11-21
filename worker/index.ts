import { READING_ID_RE } from '../shared/types';
import { handleContact } from '../server/api/contact';
import { handleFeedback } from '../server/api/feedback';
import { handleReading } from '../server/api/reading';
import { handleAdmin, handleSavedReading } from '../server/api/readings';
import type { Env } from '../server/env';
import { expireOldPhotos } from '../server/store';
import { purgeRateLimits } from '../server/protect';

const POST_API: Record<string, (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>> = {
  '/api/reading': handleReading,
  '/api/feedback': handleFeedback,
  '/api/contact': handleContact,
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // The old app subdomain and www both point to the single site.
    if (url.hostname === 'app.palmreadings.ai') {
      return Response.redirect(`https://palmreadings.ai/reading/${url.search}`, 301);
    }
    if (url.hostname === 'www.palmreadings.ai') {
      return Response.redirect(`https://palmreadings.ai${path}${url.search}`, 301);
    }

    if (path.startsWith('/api/')) {
      const post = POST_API[path];
      if (post) {
        if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
        return post(request, env, ctx);
      }
      return (
        (await handleSavedReading(request, env, path)) ??
        (await handleAdmin(request, env, path)) ??
        Response.json({ error: 'Not found' }, { status: 404 })
      );
    }

    // Private reading links: /r/<id>/ all serve the same static page, which loads the reading by id.
    const r = path.match(/^\/r\/([^/]+)\/?$/);
    if (r) {
      if (!READING_ID_RE.test(r[1])) {
        const notFound = await env.ASSETS.fetch(new Request(new URL('/404', url), request));
        return new Response(notFound.body, { status: 404, headers: notFound.headers });
      }
      if (!path.endsWith('/')) return Response.redirect(`${url.origin}${path}/`, 301);
      const page = await env.ASSETS.fetch(new Request(new URL('/r/', url), request));
      const res = new Response(page.body, page);
      res.headers.set('x-robots-tag', 'noindex');
      res.headers.set('referrer-policy', 'no-referrer');
      res.headers.set('cache-control', 'private, no-store');
      return res;
    }

    // Old WordPress sitemaps (Yoast, Rank Math, core) point search engines to the new one.
    if (/^\/(sitemap_index|sitemap-index|[a-z-]+-sitemap\d*|wp-sitemap[a-z0-9-]*)\.xml$/.test(path)) {
      return Response.redirect(`${url.origin}/sitemap.xml`, 301);
    }

    // Old WordPress URLs with no equivalent.
    if (
      /^\/(uncategorized|category|tag|author|feed|comments)(\/|$)/.test(path) ||
      path.startsWith('/wp-') ||
      path === '/index.php' ||
      (path === '/' && url.searchParams.has('p'))
    ) {
      return Response.redirect(`${url.origin}/`, 301);
    }

    // Pages live at addresses ending in "/": redirect permanently (the asset server would use a temporary 307).
    if (!path.endsWith('/') && !path.split('/').pop()!.includes('.')) {
      return Response.redirect(`${url.origin}${path}/${url.search}`, 301);
    }

    // Staging and preview hosts (e.g. *.workers.dev) must never be indexed: only palmreadings.ai is.
    if (url.hostname !== 'palmreadings.ai') {
      if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      const res = await env.ASSETS.fetch(request);
      const out = new Response(res.body, res);
      out.headers.set('x-robots-tag', 'noindex, nofollow');
      return out;
    }

    return env.ASSETS.fetch(request);
  },

  // Daily: delete photos of readings not opened in 3 years (the readings themselves are kept).
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      expireOldPhotos(env).then((n) => {
        if (n) console.log(`Photo retention: deleted photos for ${n} reading(s)`);
      }),
    );
    ctx.waitUntil(purgeRateLimits(env));
  },
} satisfies ExportedHandler<Env>;
