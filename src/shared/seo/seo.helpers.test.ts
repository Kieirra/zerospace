import { describe, expect, it } from 'vitest';
import { serializeJsonLd, toBreadcrumbList, toCanonicalPath, truncateDescription } from './seo.helpers.ts';

const SITE = new URL('https://www.zerospace.fr');

describe('SEO helpers', () => {
  it('should number the items and make their URLs absolute when building a breadcrumb', () => {
    const items = [
      { name: 'Guides', path: '/guides' },
      { name: 'Exalted Arandi', path: '/guides/exalted-arandi' },
    ];

    expect(toBreadcrumbList(items, SITE)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Guides', item: 'https://www.zerospace.fr/guides' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Exalted Arandi',
          item: 'https://www.zerospace.fr/guides/exalted-arandi',
        },
      ],
    });
  });

  it('should drop the trailing slash of the build pathname except for the root', () => {
    expect(toCanonicalPath('/wiki/grell/units/')).toBe('/wiki/grell/units');
    expect(toCanonicalPath('/wiki')).toBe('/wiki');
    expect(toCanonicalPath('/')).toBe('/');
  });

  it('should escape the closing script tag when serializing JSON-LD', () => {
    const json = serializeJsonLd({ headline: '</script><script>alert(1)</script>' });

    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toEqual({ headline: '</script><script>alert(1)</script>' });
  });

  it('should cut on a word and end with an ellipsis when the description is longer than 155 characters', () => {
    const description = truncateDescription(`${'word '.repeat(40)}end`);

    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toMatch(/word…$/);
    expect(truncateDescription('Short description.')).toBe('Short description.');
  });
});
