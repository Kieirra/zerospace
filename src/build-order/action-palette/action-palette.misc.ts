import { BUILD_FULL_TEXT } from '../build-editor/build-editor.constants.ts';
import { isFullBuild } from '../build-editor/build-editor.helpers.ts';
import { REPLICATE_NAME, REPLICATE_STUN_SECONDS, REPLICATE_TOPBAR_ID } from '../game-data/game-data.constants.ts';
import { MISC_EVENTS } from '../game-data/game-data.misc.ts';
import type { Build, BuildCatalog, BuildEntity } from '../build-order.types.ts';
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

// TOP BAR section (US-009), a side whose units Replicate can copy only (the Xol): the Replicate card, on the unit of the
// step selected on the timeline, its energy shown. Added as a copy of that unit, never placed by a drop.
export const toTopBarTiles = (build: Build, catalog: BuildCatalog, selectedStepUid: string | null): PaletteTileData[] => {
  if (![...catalog.values()].some(({ replicateEnergy }) => replicateEnergy !== undefined)) return [];
  const target = toReplicateTarget(build, catalog, selectedStepUid);
  const reason = target ? null : 'Select a Xol unit step to replicate.';
  return [
    {
      entity: toReplicateCard(build.factionId),
      disabledReason: isFullBuild(build) ? BUILD_FULL_TEXT : reason,
      status: 'available',
      section: 'TOP BAR',
      lines: target ? [`${target.replicateEnergy} Energy`] : [],
    },
  ];
};

// The unit of the selected step when Replicate can copy it (a unit, a merge or a copy).
export const toReplicateTarget = (build: Pick<Build, 'queued'>, catalog: BuildCatalog, selectedStepUid: string | null) => {
  const step = build.queued.find(({ uid }) => uid === selectedStepUid);
  const entity = step && catalog.get(step.entityId);
  return entity?.replicateEnergy === undefined ? undefined : entity;
};

const toReplicateCard = (sideId: string): BuildEntity => ({
  id: REPLICATE_TOPBAR_ID,
  sideId,
  kind: 'unit',
  category: 'replicate',
  name: REPLICATE_NAME,
  displayName: REPLICATE_NAME,
  cost: { hexite: 0, flux: 0 },
  count: 1,
  supply: 0,
  duration: REPLICATE_STUN_SECONDS.value,
  producedBy: [],
  requires: [],
  appliesTo: [],
  isVariant: false,
});

const EVENT_IDS = Object.keys(MISC_EVENTS);

const toRank = (entity: BuildEntity, factionId: string) => {
  if (entity.category === 'event') return 2 + EVENT_IDS.indexOf(entity.id);
  return entity.sideId === factionId ? 0 : 1;
};

const toLevel = (entity: BuildEntity) => entity.level ?? 0;
