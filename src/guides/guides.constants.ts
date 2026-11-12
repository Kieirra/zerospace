import { GITHUB_URL } from '../shared/site.constants.ts';
import type { GuideStyle } from './guides.types.ts';

export const MAIN_FACTION_ORDER = ['protectorate', 'grell', 'the-legion', 'the-xol'] as const;

export const MAIN_FACTION_LETTERS: Record<string, string> = {
  protectorate: 'P',
  grell: 'G',
  'the-legion': 'L',
  'the-xol': 'X',
};

// Each occurrence in a build order is an expansion.
export const HEADQUARTER_IDS = new Set([
  'protectorate/building/operating-tower',
  'grell/building/bloomwell',
  'the-legion/building/garrison-tower',
  'the-xol/building/world-engine',
]);

// Lightened faction colors, readable on the site background and under --color-bg text.
export const GUIDE_FACTION_ACCENTS: Record<string, string> = {
  protectorate: '#f0b100',
  grell: '#8fc73e',
  'the-legion': '#9b6bd6',
  'the-xol': '#e0484a',
};

// Display accents: the game colors are too dark on the site background (Free Corsairs, Endari, Valkaru) or clash with the site accent (Arandi).
export const MERCENARY_ACCENTS: Record<string, string> = {
  arandi: '#e05bff',
  'chakru-kingdom': '#6baed5',
  endari: '#8a70ff',
  'free-corsairs': '#e0523f',
  marran: '#d58640',
  valkaru: '#a988b5',
};

export const GUIDE_STYLE_LABELS: Record<GuideStyle, string> = {
  'one-base': 'One base',
  expand: 'Expand',
  'all-in': 'All-in',
};

export const NEW_GUIDE_DAYS = 7;

export const OUTDATED_PATCH_GAP = 2;

export const ADD_GUIDE_URL = `${GITHUB_URL}/issues/new?template=guide.md`;
