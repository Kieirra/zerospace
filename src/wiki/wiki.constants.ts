import type { EntityKind, Tab } from './wiki.types.ts';

export const TABS: Tab[] = [
  { slug: 'units', kind: 'unit', label: 'Units' },
  { slug: 'heroes', kind: 'hero', label: 'Heroes' },
  { slug: 'buildings', kind: 'building', label: 'Buildings' },
  { slug: 'topbar', kind: 'topbar', label: 'Topbar' },
  { slug: 'talents', kind: 'talent', label: 'Talents' },
  { slug: 'upgrades', kind: 'upgrade', label: 'Upgrades' },
];

export const KIND_LABELS: Record<EntityKind, string> = {
  unit: 'Unit',
  hero: 'Hero',
  building: 'Building',
  topbar: 'Topbar',
  talent: 'Talent',
  upgrade: 'Upgrade',
};

export const OTHER_GROUP = 'Other';

// Display accent overriding the game color when it clashes with the artwork (Xol: red of the mask glow, desaturated).
export const FACTION_ACCENTS: Record<string, string> = {
  'the-xol': '#cf3031',
};

// Image id of the /wiki banner (e.g. 'art/title-back'); no banner while undefined.
export const TITLE_ART_ID: string | undefined = undefined;
