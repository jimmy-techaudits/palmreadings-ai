// XML sitemap of every public page (built to /sitemap.xml). Pages come from PUBLIC_PAGES in src/seo.ts.
import type { APIRoute } from 'astro';
import { PUBLIC_PAGES, SITE_URL } from '../seo';

export const GET: APIRoute = () => {
  const urls = PUBLIC_PAGES.map(
    (p) => `  <url>\n    <loc>${new URL(p.path, SITE_URL).toString()}</loc>\n    <lastmod>${p.updated}</lastmod>\n  </url>`,
  ).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
