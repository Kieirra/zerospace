import {
  BUILD_ORDER_FIELDS,
  GUIDE_STYLE_LABELS,
  MAIN_FACTION_LETTERS,
  MAIN_FACTION_ORDER,
  NEW_GUIDE_DAYS,
  OUTDATED_PATCH_GAP,
} from './guides.constants.ts';
import type { Entity } from '../wiki/wiki.types.ts';
import type { BuildOrderField, GuideStyle, PatchStatus } from './guides.types.ts';

const DAY_MS = 86_400_000;
const PATCH_LABEL_PATTERN = /^Update #(\d+)$/;
const MAX_SUGGESTION_DISTANCE = 3;
// Levels where the second talent is the mercenary one.
const MERCENARY_TALENT_LEVELS = new Set([2, 4, 6]);

export const getPatchStatus = (patch: number, latest: number): PatchStatus => {
  const gap = latest - patch;
  if (gap >= OUTDATED_PATCH_GAP) return 'outdated';
  return gap === 1 ? 'previous' : 'current';
};

export const isNewGuide = (added: string, now: Date) =>
  now.getTime() - Date.parse(`${added}T00:00:00Z`) < NEW_GUIDE_DAYS * DAY_MS;

export const assertGeneralGuideFields = (data: Partial<Record<BuildOrderField, unknown>>) => {
  const field = BUILD_ORDER_FIELDS.find((key) => data[key] !== undefined);
  if (field) throw new Error(`${field} is only allowed in a build order.`);
};

// "LvX": the guide faction against each opponent, in P, G, L, X order.
export const toMatchupTags = (faction: string, vsKeys: string[]) =>
  MAIN_FACTION_ORDER.filter((key) => vsKeys.includes(key)).map(
    (key) => `${MAIN_FACTION_LETTERS[faction]}v${MAIN_FACTION_LETTERS[key]}`,
  );

export const toGuideTags = (guide: TaggedGuide) =>
  guide.type === 'build-order' ? ['Versus', ...guide.matchupTags, GUIDE_STYLE_LABELS[guide.style]] : ['Guide'];

// One digit per level: 1 = top talent, 2 = bottom talent (the mercenary one on levels 2, 4 and 6).
export const resolveTalents = (code: string, factionTalents: Entity[], mercenaryTalents: Entity[]) =>
  [...code].map((digit, index) => {
    const level = index + 1;
    const position = digit === '1' ? 'A' : 'B';
    const talent =
      position === 'B' && MERCENARY_TALENT_LEVELS.has(level)
        ? mercenaryTalents.find((candidate) => candidate.level === level)
        : factionTalents.find((candidate) => candidate.level === level && candidate.position === position);
    if (!talent) throw new Error(`talents: no talent at level ${level} position ${position}.`);
    return talent;
  });

export const latestPatchNumber = (labels: string[]) =>
  Math.max(...labels.flatMap((label) => label.match(PATCH_LABEL_PATTERN)?.[1] ?? []).map(Number));

export const findClosestName = (name: string, names: string[]) => {
  const target = name.toLowerCase();
  let closest: { name: string; distance: number } | undefined;
  for (const candidate of names) {
    const distance = levenshtein(target, candidate.toLowerCase());
    if (distance <= MAX_SUGGESTION_DISTANCE && (!closest || distance < closest.distance)) closest = { name: candidate, distance };
  }
  return closest?.name;
};

export const byAddedThenTitle = (a: Sortable, b: Sortable) => b.added.localeCompare(a.added) || a.title.localeCompare(b.title);

export const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

type TaggedGuide = { type: 'build-order'; matchupTags: string[]; style: GuideStyle } | { type: 'guide' };

interface Sortable {
  added: string;
  title: string;
}

const levenshtein = (a: string, b: string) => {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
};
