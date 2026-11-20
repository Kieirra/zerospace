import { MISC_EVENTS } from '../game-data/game-data.misc.ts';
import type { BuildEntity } from '../build-order.types.ts';
import type { PaletteTileData } from './action-palette.helpers.ts';

// Misc tab (US-008): the talents of the faction, then those of the mercenary, each by level; the events last, in the
// order of MISC_EVENTS. Stable sort: the wiki order (`order`, then name) breaks the ties.
export const toMiscOrder = (tiles: PaletteTileData[], factionId: string) =>
  [...tiles].sort((a, b) => toRank(a.entity, factionId) - toRank(b.entity, factionId) || toLevel(a.entity) - toLevel(b.entity));

// 'Level 2', '+2 Harvesters', '+10% Flux income': what the card shows in place of its cost.
export const toMiscLabelParts = (entity: Pick<BuildEntity, 'level' | 'effectLines'>) => [
  ...(entity.level === undefined ? [] : [`Level ${entity.level}`]),
  ...(entity.effectLines ?? []),
];

const EVENT_IDS = Object.keys(MISC_EVENTS);

const toRank = (entity: BuildEntity, factionId: string) => {
  if (entity.category === 'event') return 2 + EVENT_IDS.indexOf(entity.id);
  return entity.sideId === factionId ? 0 : 1;
};

const toLevel = (entity: BuildEntity) => entity.level ?? 0;
