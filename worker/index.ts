import { CONSENT_REGIONS } from '../shared/consent';
import { READING_ID_RE } from '../shared/types';
import { handleContact } from '../server/api/contact';
import { handleFeedback } from '../server/api/feedback';
import { handleReading } from '../server/api/reading';
import { handleAdmin, handleSavedReading } from '../server/api/readings';
import {
  handleCheckout,
  handleCheckoutStatus,
  handleConfig,
  handleMockCheckout,
  handleStripeWebhook,
  handleUnlock,
  handleUnsubscribe,
} from '../server/api/payments';
import type { Env } from '../server/env';
import { expireOldPhotos } from '../server/store';
import { purgeFreeClaims } from '../server/payments';
import { purgeRateLimits } from '../server/protect';

const POST_API: Record<string, (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>> = {
  '/api/reading': handleReading,
  '/api/feedback': handleFeedback,
  '/api/contact': handleContact,
  '/api/checkout': handleCheckout,
  '/api/stripe/webhook': handleStripeWebhook,
};

/** Payment routes with an id or a GET method. Returns null when the path isn't one of them. */
async function routePayments(request: Request, env: Env, ctx: ExecutionContext, path: string): Promise<Response | null> {
  if (path === '/api/config' && request.method === 'GET') return handleConfig(request, env);
  if (path === '/api/unsubscribe' && (request.method === 'GET' || request.method === 'POST')) return handleUnsubscribe(request, env, ctx);
  const mock = path.match(/^\/api\/checkout\/mock\/([A-Za-z0-9_]+)$/);
  if (mock && request.method === 'GET') return handleMockCheckout(request, env, mock[1]);
  const status = path.match(/^\/api\/checkout\/([A-Za-z0-9_]+)$/);
  if (status && request.method === 'GET') return handleCheckoutStatus(request, env, status[1]);
  const unlock = path.match(/^\/api\/readings\/([^/]+)\/unlock$/);
  if (unlock && request.method === 'POST') {
    if (!READING_ID_RE.test(unlock[1])) return Response.json({ error: 'Not found' }, { status: 404 });
    return handleUnlock(request, env, ctx, unlock[1]);
  }
  return null;
}

/**
 * Marks HTML pages for visitors from countries where analytics cookies need consent first, so the page
 * shows the cookie banner. Add ?consent_region=1 to any page address to see the banner from anywhere.
 */
function markConsentRegion(request: Request, res: Response): Response {
  if (!res.headers.get('content-type')?.includes('text/html')) return res;
  const url = new URL(request.url);
  const country = (request as Request & { cf?: { country?: string } }).cf?.country;
  const required = (country && CONSENT_REGIONS.includes(country)) || url.searchParams.get('consent_region') === '1';
  if (!required) return res;
  return new HTMLRewriter()
    .on('html', {
      element(el) {
        el.setAttribute('data-consent', 'required');
      },
    })
    .transform(res);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    return markConsentRegion(request, await route(request, env, ctx));
  },

  // Daily: delete photos of readings not opened in 3 years (the readings themselves are kept).
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      expireOldPhotos(env).then((n) => {
        if (n) console.log(`Photo retention: deleted photos for ${n} reading(s)`);
      }),
    );
    ctx.waitUntil(purgeRateLimits(env));
    ctx.waitUntil(purgeFreeClaims(env));
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
    const payments = await routePayments(request, env, ctx, path);
    if (payments) return payments;
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
}
