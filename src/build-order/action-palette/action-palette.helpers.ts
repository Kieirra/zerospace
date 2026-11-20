import { byOrderThenName } from '../../wiki/wiki.helpers.ts';
import {
  formatSupply,
  isMiscCategory,
  isOncePerBuild,
  joinNames,
  toCapableProducerUids,
  toCostParts,
  toDurationLabel,
  toStepKind,
} from '../build-order.helpers.ts';
import { BUILD_FULL_TEXT } from '../build-editor/build-editor.constants.ts';
import { isEmptyBuild, isFullBuild, toAllSteps, toOnceRuleReason } from '../build-editor/build-editor.helpers.ts';
import { toMergeRecipeLine } from '../catalog/catalog.merges.ts';
import { toMissingRequires } from '../engine/engine.analysis.ts';
import { missingRequirement } from '../engine/engine.diagnostics.ts';
import { toUnobtainableInputs } from '../engine/engine.merges.ts';
import { toBuildScope, toNames } from '../engine/engine.placement.ts';
import { MERGE_ORDER } from '../game-data/game-data.constants.ts';
import { toMiscLabelParts, toMiscOrder, toTopBarTiles } from './action-palette.misc.ts';
import type { Build, BuildCatalog, BuildEntity, EntityCategory } from '../build-order.types.ts';
import type { GameRules } from '../rules/rules.data.ts';

export type PaletteTabId = 'buildings' | 'units' | 'research' | 'mercenary' | 'misc';

// in-build: research, talent or hero already in the steps; free-setup: setup hero, never a step.
type TileStatus = 'available' | 'in-build' | 'free-setup';

export interface PaletteTileData {
  entity: BuildEntity;
  // Why it cannot be added now (Kieirra 2026-11-19): the tile is disabled; null when it can.
  disabledReason: string | null;
  status: TileStatus;
  // Title of the section the tile opens or belongs to in its tab ('MERGE', 'TOP BAR', US-009); none for most tabs.
  section?: string;
  // Lines the tile shows in place of its supply: the recipe of a merge, the energy of a Replicate copy.
  lines?: string[];
}

export interface PaletteTab {
  id: PaletteTabId;
  label: string;
  tiles: PaletteTileData[];
}

export interface PaletteContext {
  // Faction + mercenary entities.
  catalog: BuildCatalog;
  rules: GameRules;
  startingBuildingId?: string;
}

// `selectedStepUid`: the step selected on the timeline, the target of the Replicate card (US-009).
export const toPaletteTabs = (build: Build, context: PaletteContext, selectedStepUid: string | null = null): PaletteTab[] => {
  const entities = [...context.catalog.values()].sort(byOrderThenName);
  const toTiles = (categories: EntityCategory[], sideId?: string) =>
    entities
      .filter((entity) => categories.includes(entity.category) && !entity.isVariant && (!sideId || entity.sideId === sideId))
      .map((entity) => toTile(entity, build, context));
  // Altar heroes, only where heroes are paid for (Legion): after the units (Kieirra 2026-11-19).
  const heroes = context.rules.heroes.paidHeroSlots.value > 0 ? toTiles(['hero'], build.factionId) : [];
  const tabs: PaletteTab[] = [
    { id: 'buildings', label: 'Buildings', tiles: toTiles(['building']) },
    {
      id: 'units',
      label: 'Units',
      tiles: [...toUnitOrder(toTiles(['harvester', 'unit']), context.startingBuildingId), ...toMergeTiles(toTiles(['merge']), context.catalog), ...heroes],
    },
    { id: 'research', label: 'Research', tiles: toResearchOrder(toTiles(['research', 'transformation']), context.catalog) },
    // Same label for every mercenary side (Kieirra 2026-11-19): the tiles are those of the chosen one.
    { id: 'mercenary', label: 'Merc', tiles: toTiles(['mercenary-building', 'mercenary-unit']) },
    {
      id: 'misc',
      label: 'Misc',
      tiles: [...toMiscOrder(toTiles(['talent', 'event']), build.factionId), ...toTopBarTiles(build, context.catalog, selectedStepUid)],
    },
  ];
  return tabs.filter(({ tiles }) => tiles.length > 0);
};

// Research tab (Kieirra 2026-11-19): grouped by research building (first required building), groups in the Buildings
// tab order; in a group, by upgraded entity in its order, then tier and name; a transformation after the research of the
// building it transforms. Without building: last. Stable sort.
export const toResearchOrder = (tiles: PaletteTileData[], catalog: BuildCatalog) =>
  tiles
    .map((tile) => ({ tile, place: toResearchPlace(tile.entity, catalog) }))
    .sort((a, b) => byResearchPlace(a.place, b.place))
    .map(({ tile }) => tile);

// First reason the entity cannot be added to the build (Kieirra 2026-11-19), null when it can: the tile is disabled.
export const toTileDisabledReason = (entity: BuildEntity, build: Build, context: Pick<PaletteContext, 'catalog' | 'rules'>) => {
  const { catalog, rules } = context;
  if (isFullBuild(build)) return BUILD_FULL_TEXT;
  const others = toAllSteps(build).flatMap(({ entityId }) => catalog.get(entityId) ?? []);
  const { available } = toBuildScope(build, catalog);
  const isQueued = toStepKind(entity) === 'queued';
  // A merge has no producer: the producers of its tier 1 units (US-009).
  const producerIds =
    entity.category === 'merge' ? toUnobtainableInputs(entity, available, catalog).flatMap(({ producedBy }) => producedBy) : entity.producedBy;
  if (isQueued && entity.category !== 'merge' && producerIds.length === 0) return 'Producer unknown in the game data.';
  if (isQueued && producerIds.length > 0 && (entity.category === 'merge' || toCapableProducerUids(entity, build, catalog).length === 0)) {
    return `Build a ${joinNames(toNames([...new Set(producerIds)], catalog), 'or')} first.`;
  }
  const missing = toMissingRequires(entity.requires, rules.requiresMode[entity.kind].value, (id) => available.has(id));
  if (missing) return missingRequirement(toNames(missing.ids, catalog), missing.conjunction).message;
  return toOnceRuleReason(entity, others, build, rules);
};

// Case and accent insensitive search on the display name, every tab; empty tabs dropped.
export const filterTiles = (tabs: PaletteTab[], query: string) => {
  const needle = normalize(query.trim());
  return tabs
    .map((tab) => ({ ...tab, tiles: tab.tiles.filter(({ entity }) => normalize(entity.displayName).includes(needle)) }))
    .filter(({ tiles }) => tiles.length > 0);
};

// First tile in game order: several tiles of a tab may share a hotkey.
export const findTileByHotkey = (tiles: PaletteTileData[], key: string) =>
  tiles.find(({ entity, disabledReason }) => disabledReason === null && entity.hotkey?.toUpperCase() === key.toUpperCase());

// 'Add Barracks, 75 Hexite, 0:35, hotkey D', 'Add Thrall, 50 Hexite, 2 supply, 0:30, hotkey Q',
// 'Add Lore of Flux, Level 2, +3 Harvesters, +10% Flux income'
export const toTileLabel = ({ entity, disabledReason, lines }: PaletteTileData) =>
  [
    `Add ${entity.displayName}`,
    ...(isMiscCategory(entity) ? toMiscLabelParts(entity) : toCostLabelParts(entity)),
    ...(lines ?? []),
    ...(disabledReason === null ? [] : [disabledReason]),
  ].join(', ');

// An empty build starts on the harvesters: the empty list proposes the harvester hotkey.
export const toDefaultTabId = (build: Build): PaletteTabId => (isEmptyBuild(build) ? 'units' : 'buildings');

// Merges of the Units tab, in their section, with their recipe (US-009).
const toMergeTiles = (tiles: PaletteTileData[], catalog: BuildCatalog) =>
  [...tiles]
    .sort((a, b) => MERGE_ORDER.indexOf(a.entity.id) - MERGE_ORDER.indexOf(b.entity.id))
    .map((tile): PaletteTileData => ({ ...tile, section: 'MERGE', lines: [toMergeRecipeLine(tile.entity, catalog)] }));

const toCostLabelParts = (entity: BuildEntity) => [
  ...toCostParts(entity.cost),
  ...(entity.supply > 0 ? [`${formatSupply(entity.supply)} supply`] : []),
  toDurationLabel(entity.duration),
  ...(entity.hotkey ? [`hotkey ${entity.hotkey}`] : []),
];

// What the starting building makes leads, harvesters first, then the wiki order (Kieirra 2026-11-19); stable sort.
const toUnitOrder = (tiles: PaletteTileData[], startingBuildingId?: string) => {
  const toRank = ({ entity }: PaletteTileData) => {
    if (startingBuildingId === undefined || !entity.producedBy.includes(startingBuildingId)) return 2;
    return entity.category === 'harvester' ? 0 : 1;
  };
  return [...tiles].sort((a, b) => toRank(a) - toRank(b));
};

interface ResearchPlace {
  entity: BuildEntity;
  building?: BuildEntity;
  isTransformation: boolean;
  upgraded?: BuildEntity;
}

const toResearchPlace = (entity: BuildEntity, catalog: BuildCatalog): ResearchPlace => {
  const isTransformation = entity.category === 'transformation';
  const buildingIds = isTransformation ? entity.appliesTo.slice(0, 1) : entity.requires;
  const building = buildingIds.map((id) => catalog.get(id)).find((candidate) => candidate?.kind === 'building');
  return { entity, building, isTransformation, upgraded: catalog.get(entity.appliesTo[0]) };
};

const byResearchPlace = (a: ResearchPlace, b: ResearchPlace) =>
  byOrderThenMissing(a.building, b.building) ||
  Number(a.isTransformation) - Number(b.isTransformation) ||
  byOrderThenMissing(a.upgraded, b.upgraded) ||
  byOrderThenName(a.entity, b.entity);

const byOrderThenMissing = (a?: BuildEntity, b?: BuildEntity) => (a && b ? byOrderThenName(a, b) : Number(!a) - Number(!b));

const toTile = (entity: BuildEntity, build: Build, context: PaletteContext): PaletteTileData => ({
  entity,
  disabledReason: toTileDisabledReason(entity, build, context),
  status: toTileStatus(entity, build),
});

const toTileStatus = (entity: BuildEntity, build: Build): TileStatus => {
  if (entity.category === 'hero' && entity.id === build.heroId) return 'free-setup';
  const isOnce = isOncePerBuild(entity) || entity.category === 'hero';
  return isOnce && toAllSteps(build).some(({ entityId }) => entityId === entity.id) ? 'in-build' : 'available';
};

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
