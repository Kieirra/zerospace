import { truncateDescription } from '../shared/seo/seo.helpers.ts';
import type { BreadcrumbItem } from '../shared/seo/seo.helpers.ts';
import { SITE_NAME } from '../shared/site.constants.ts';
import type { Guide } from './guides.types.ts';

const GUIDE_LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

export const GUIDES_TITLE = `${SITE_NAME} Guides`;

export const toGuideTitle = ({ title }: Guide) => `${title} · ${GUIDES_TITLE}`;

export const describeGuides = (guides: Guide[]) => {
  const titles = guides.map(({ title }) => title).join(', ');
  return truncateDescription(`${SITE_NAME} guides for Versus mode (1v1)${titles ? `: ${titles}` : ''}.`);
};

// "The Legion + Arandi. <frontmatter description>", cut to the description length.
export const describeGuide = ({ faction, mercenary, description }: Guide) => {
  const factions = [faction, mercenary].flatMap((item) => (item ? [item.name] : [])).join(' + ');
  return truncateDescription(factions ? `${factions}. ${description}` : description);
};

export const toGuideBreadcrumb = ({ slug, title }: Guide): BreadcrumbItem[] => [
  { name: 'Guides', path: '/guides' },
  { name: title, path: `/guides/${slug}` },
];

export const toGuideArticle = ({ title, author, description, added }: Guide) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  author: { '@type': 'Person', name: author },
  datePublished: added,
  license: GUIDE_LICENSE_URL,
  inLanguage: 'en',
});
