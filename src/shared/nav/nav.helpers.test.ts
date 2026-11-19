import { describe, expect, it } from 'vitest';
import { toNavSection } from './nav.helpers.ts';

describe('Site menu: current section', () => {
  it('should mark Wiki on the wiki and its pages', () => {
    expect(toNavSection('/wiki')).toBe('wiki');
    expect(toNavSection('/wiki/the-legion/unit/exalted')).toBe('wiki');
  });

  it('should mark Guides on the guides and each guide', () => {
    expect(toNavSection('/guides')).toBe('guides');
    expect(toNavSection('/guides/exalted-arandi')).toBe('guides');
  });

  it('should mark Theorycraft on the build order tool', () => {
    expect(toNavSection('/build-order/')).toBe('build-order');
  });

  it('should mark nothing on the root or an unknown page', () => {
    expect(toNavSection('/')).toBeNull();
    expect(toNavSection('/wikipedia')).toBeNull();
    expect(toNavSection('/unknown/page')).toBeNull();
  });
});
