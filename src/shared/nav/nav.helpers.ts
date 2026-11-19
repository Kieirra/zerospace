export type NavSection = 'wiki' | 'guides' | 'build-order';

const SECTIONS: NavSection[] = ['wiki', 'guides', 'build-order'];

// Section of the site menu holding the page, read from the first segment of its path; null for any other page.
export const toNavSection = (pathname: string): NavSection | null => {
  const segment = pathname.split('/')[1];
  return SECTIONS.find((section) => section === segment) ?? null;
};
