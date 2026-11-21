// Search engine setup: the public pages for the sitemap, and the structured data (JSON-LD) on every page.
import { CONTACT_EMAIL, IMAGES } from './site';

export const SITE_URL = 'https://palmreadings.ai';
export const SITE_NAME = 'Palm Readings AI';
export const LEGAL_NAME = 'Lotuzen Tech LLC';
/** 1200 x 630 image shown when a page is shared on social media or in messages. */
export const SHARE_IMAGE = '/images/og-palm-readings-ai.jpg';

/**
 * Every public, indexable page. The sitemap is built from this list, so add new pages here.
 * `updated` is the date the page's content last changed meaningfully (YYYY-MM-DD).
 */
export const PUBLIC_PAGES: { path: string; updated: string }[] = [
  { path: '/', updated: '2026-11-21' },
  { path: '/reading/', updated: '2026-11-21' },
  { path: '/about/', updated: '2026-11-21' },
  { path: '/contact/', updated: '2026-11-21' },
  { path: '/privacy-policy/', updated: '2026-11-21' },
  { path: '/terms/', updated: '2026-11-21' },
  { path: '/refund-policy/', updated: '2026-11-21' },
];

const abs = (path: string) => new URL(path, SITE_URL).toString();

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

type Node = Record<string, unknown>;

export type PageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';

/** Organization and WebSite: the same on every page. */
function siteNodes(): Node[] {
  return [
    {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: SITE_NAME,
      legalName: LEGAL_NAME,
      url: `${SITE_URL}/`,
      email: CONTACT_EMAIL,
      logo: { '@type': 'ImageObject', url: abs(IMAGES.logo), width: 700, height: 300 },
      image: abs(IMAGES.icon),
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: CONTACT_EMAIL, url: abs('/contact/'), availableLanguage: 'English' },
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: 'PalmReadings.ai',
      inLanguage: 'en-US',
      publisher: { '@id': ORGANIZATION_ID },
    },
  ];
}

/** The online palm reading service, described on the home page and the reading page. */
export function readingServiceNode(): Node {
  return {
    '@type': 'Service',
    '@id': `${SITE_URL}/#palm-reading`,
    name: 'AI palm reading',
    serviceType: 'Palm reading',
    description:
      'A personal palm reading from photos of both hands, grounded in traditional palmistry: hand shape, the heart, head, life, fate, sun and Mercury lines, mounts, and the relationship and children lines.',
    provider: { '@id': ORGANIZATION_ID },
    areaServed: 'Worldwide',
    availableChannel: { '@type': 'ServiceChannel', serviceUrl: abs('/reading/'), name: 'Online' },
    url: abs('/reading/'),
  };
}

/** The full JSON-LD graph for one page. */
export function pageGraph(opts: {
  path: string;
  title: string;
  description: string;
  type?: PageType;
  /** Name for this page in the breadcrumb trail (Home > name). Omit on the home page. */
  breadcrumb?: string;
  extra?: Node[];
}): Node {
  const url = abs(opts.path);
  const page: Node = {
    '@type': opts.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.title,
    description: opts.description,
    inLanguage: 'en-US',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(SHARE_IMAGE), width: 1200, height: 630 },
  };
  const nodes: Node[] = [...siteNodes(), page];
  if (opts.breadcrumb) {
    page.breadcrumb = { '@id': `${url}#breadcrumb` };
    nodes.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: opts.breadcrumb, item: url },
      ],
    });
  }
  nodes.push(...(opts.extra ?? []));
  return { '@context': 'https://schema.org', '@graph': nodes };
}
