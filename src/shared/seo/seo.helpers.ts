export interface BreadcrumbItem {
  name: string;
  path: string;
}

export type JsonLd = Record<string, unknown>;

const DESCRIPTION_MAX_LENGTH = 155;

// Internal links have no trailing slash; the static build gives Astro.url.pathname one ("/wiki/grell/units/").
export const toCanonicalPath = (pathname: string) => (pathname === '/' ? pathname : pathname.replace(/\/+$/, ''));

export const toAbsoluteUrl = (path: string, site?: URL) => new URL(path, site).href;

export const toBreadcrumbList = (items: BreadcrumbItem[], site?: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(({ name, path }, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: toAbsoluteUrl(path, site),
  })),
});

// "<" escaped so that a text containing "</script>" cannot close the JSON-LD script.
export const serializeJsonLd = (data: JsonLd) => JSON.stringify(data).replace(/</g, '\\u003c');

export const truncateDescription = (text: string) => {
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text;
  const cut = text.slice(0, DESCRIPTION_MAX_LENGTH - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:]+$/, '')}…`;
};
