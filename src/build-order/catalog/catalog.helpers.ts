import { byOrderThenName } from '../../wiki/wiki.helpers.ts';
import { FACTION_ACCENTS } from '../../wiki/wiki.constants.ts';
import { HERO_OVERRIDES, PRODUCTION_CHARGES_OVERRIDES, SUPPLY_PROVIDED_OVERRIDES } from '../game-data/game-data.constants.ts';
import { isMadeByCharge, toMergeCost, toXolFields } from './catalog.merges.ts';
import { toMiscEntities } from './catalog.misc.ts';
import { toNameKinds } from './catalog.names.ts';
import { toOfferedEntities } from './catalog.offer.ts';
import type { EconomyStat } from '../../wiki/wiki-data.types.ts';
import type { Entity } from '../../wiki/wiki.types.ts';
import type { HeroOverride } from '../game-data/game-data.constants.ts';
import type { GameRules } from '../rules/rules.data.ts';
import type {
  BuildEntity,
  EntityCategory,
  FluxHarvesterEconomy,
  HeroPoolEntry,
  HexiteBaseEconomy,
  Side,
  SideCatalog,
  SideKind,
} from '../build-order.types.ts';

export type BuildableEntity = Entity & { kind: BuildEntity['kind'] };

// Faction file as read from the data: `heroes` is not part of the content schema.
export interface SideSource {
  id: string;
  kind: SideKind;
  name: string;
  color?: string;
  heroes?: unknown;
}

export const isBuildableEntity = (entity: Entity): entity is BuildableEntity =>
  entity.kind === 'building' || entity.kind === 'unit' || entity.kind === 'hero' || entity.kind === 'upgrade';

export const toSide = (source: SideSource, sources: SideSource[], imageUrl?: string): Side => {
  const heroIds = toHeroIds(source);
  return {
    id: source.id,
    kind: source.kind,
    name: source.name,
    accent: FACTION_ACCENTS[source.id] ?? source.color ?? 'currentColor',
    imageUrl,
    heroIds,
    commonHeroIds: getCommonHeroIds(
      heroIds,
      sources.map((other) => ({ kind: other.kind, heroIds: toHeroIds(other) })),
    ),
  };
};

export const toSideEntities = (
  side: Pick<Side, 'id' | 'kind'>,
  entities: Entity[],
  findImageUrl: (id: string) => string | undefined,
) =>
  toOfferedEntities(
    entities
      .filter(isBuildableEntity)
      .filter((entity) => entity.faction === side.id)
      .sort(byOrderThenName)
      .map((entity) => {
        const built = toBuildEntity(entity, side.kind, findImageUrl(entity.id));
        return built.category === 'merge' ? { ...built, cost: toMergeCost(entity, entities) } : built;
      }),
  );

// A side as the editor loads it: its entities, then its Misc steps (US-008).
export const toSideCatalog = (side: Side, entities: Entity[], findImageUrl: (id: string) => string | undefined): SideCatalog => ({
  side,
  entities: [...toSideEntities(side, entities, findImageUrl), ...toMiscEntities(side, entities, findImageUrl)],
  nameKinds: toNameKinds(side.id, entities),
});

export const toBuildEntity = (
  entity: BuildableEntity,
  sideKind: SideKind,
  imageUrl?: string,
  heroOverrides: Record<string, HeroOverride> = HERO_OVERRIDES,
): BuildEntity => {
  const heroOverride = heroOverrides[entity.id];
  const category = getCategory(entity, sideKind);
  return {
    id: entity.id,
    sideId: entity.faction,
    kind: entity.kind,
    category,
    name: entity.name,
    displayName: heroOverride?.displayName ?? entity.name,
    hotkey: entity.hotkey,
    imageUrl,
    order: entity.order,
    cost: { hexite: entity.cost?.hexite ?? 0, flux: entity.cost?.flux ?? 0 },
    count: entity.count ?? 1,
    // Data supply is per unit: a pack of `count` units costs supply × count (Mazar 2026-11-11).
    supply: (entity.supply ?? 0) * (entity.count ?? 1) * (heroOverride?.unitCount ?? 1),
    // A recruit spends a stack and arrives at once: the data gives it no build time. So does a Xol unit (US-009).
    duration: category === 'mercenary-unit' || isMadeByCharge(entity) ? 0 : (entity.buildTime ?? entity.researchTime ?? null),
    producedBy: entity.producedBy ?? [],
    requires: entity.requires ?? [],
    appliesTo: entity.appliesTo ?? [],
    transformsInto: entity.transformsInto,
    exclusiveGroup: entity.exclusiveGroup,
    isVariant: entity.kind === 'building' && entity.upgradedFrom !== undefined,
    supplyProvided: toSupplyProvided(entity),
    economy: toEconomy(entity),
    productionCharges: entity.productionCharges ?? PRODUCTION_CHARGES_OVERRIDES[entity.id],
    ...toXolFields(entity),
  };
};

export const getCategory = (
  entity: Pick<Entity, 'kind' | 'economy' | 'transformsInto' | 'mergedFrom'>,
  sideKind: SideKind,
): EntityCategory => {
  if (sideKind === 'mercenary' && entity.kind === 'building') return 'mercenary-building';
  if (sideKind === 'mercenary' && entity.kind === 'unit') return 'mercenary-unit';
  if (entity.kind === 'hero') return 'hero';
  if (entity.kind === 'upgrade') return entity.transformsInto === undefined ? 'research' : 'transformation';
  if (entity.kind === 'unit' && entity.mergedFrom !== undefined) return 'merge';
  if (entity.kind === 'unit') return hasEconomyStat(entity.economy, FLUX_PER_MIN) ? 'harvester' : 'unit';
  return 'building';
};

export const toEconomy = ({
  kind,
  economy = [],
}: Pick<Entity, 'kind' | 'economy'>): HexiteBaseEconomy | FluxHarvesterEconomy | undefined => {
  if (kind === 'building') return toHexiteBaseEconomy(economy);
  if (kind === 'unit') return toFluxHarvesterEconomy(economy);
  return undefined;
};

// Order: data field → values → number in the text → override → text without number (null) → undefined.
export const toSupplyProvided = (
  { id, supplyProvided, values, description = '' }: Pick<Entity, 'id' | 'supplyProvided' | 'values' | 'description'>,
  overrides: Record<string, number> = SUPPLY_PROVIDED_OVERRIDES,
) => {
  if (supplyProvided !== undefined) return supplyProvided;
  const fromValues = values?.supply;
  if (typeof fromValues === 'number') return fromValues;
  const fromText = SUPPLY_AMOUNT_PATTERN.exec(description);
  if (fromText) return Number(fromText[1]);
  if (overrides[id] !== undefined) return overrides[id];
  return SUPPLY_WITHOUT_AMOUNT_PATTERN.test(description) ? null : undefined;
};

// Non-variant faction building mining Hexite.
export const getStartingBuildingId = (entities: BuildEntity[]) =>
  entities.find((entity) => entity.kind === 'building' && !entity.isVariant && entity.economy?.kind === 'hexite-base')
    ?.id;

// Heroes whose slug appears in the heroes of at least two factions.
export const getCommonHeroIds = (heroIds: string[], sides: Pick<Side, 'kind' | 'heroIds'>[]) =>
  heroIds.filter(
    (heroId) =>
      sides.filter((side) => side.kind === 'faction' && side.heroIds.some((id) => toSlug(id) === toSlug(heroId)))
        .length >= 2,
  );

// Order: faction heroes, common heroes, mercenary hero.
export const getHeroPool = (
  faction: Pick<Side, 'heroIds' | 'commonHeroIds'>,
  mercenary: Pick<Side, 'heroIds'> | null,
  rules: GameRules,
): HeroPoolEntry[] => [
  ...faction.heroIds
    .filter((heroId) => !faction.commonHeroIds.includes(heroId))
    .map((heroId): HeroPoolEntry => ({ heroId, origin: 'faction' })),
  ...faction.commonHeroIds.map((heroId): HeroPoolEntry => ({ heroId, origin: 'common' })),
  ...(mercenary && rules.heroes.mercenaryHeroInPool.value
    ? mercenary.heroIds.map((heroId): HeroPoolEntry => ({ heroId, origin: 'mercenary' }))
    : []),
];

// No game without a mercenary (Kieirra 2026-11-19): the first one of the sides, as New build preselects it.
export const getDefaultMercenaryId = (sides: Pick<Side, 'id' | 'kind'>[]) => sides.find(({ kind }) => kind === 'mercenary')?.id ?? null;

export const getDefaultHeroId = (pool: HeroPoolEntry[]) =>
  (pool.find(({ origin }) => origin === 'faction') ?? pool[0])?.heroId ?? null;

const FLUX_PER_MIN = 'Flux / min';
const SUPPLY_AMOUNT_PATTERN = /Provides (\d+) Supply/i;
const SUPPLY_WITHOUT_AMOUNT_PATTERN = /Provides \{?supply\}?/i;

const toHexiteBaseEconomy = (economy: EconomyStat[]): HexiteBaseEconomy | undefined => {
  const workers = readEconomyStat(economy, 'Workers');
  const hexitePerWorkerPerMin = readEconomyStat(economy, 'Hexite / min per worker');
  const workerSpawnSeconds = readEconomyStat(economy, 'Worker spawn time');
  const pitHexite = readEconomyStat(economy, 'Pit hexite');
  const depletedRatePercent = readEconomyStat(economy, 'Rate when depleted');
  if (
    workers === undefined ||
    hexitePerWorkerPerMin === undefined ||
    workerSpawnSeconds === undefined ||
    pitHexite === undefined ||
    depletedRatePercent === undefined
  )
    return undefined;
  const rich = toRichHexite(economy, workers);
  return {
    kind: 'hexite-base',
    workers,
    hexitePerWorkerPerMin,
    workerSpawnSeconds,
    pitHexite,
    depletedRatePercent,
    ...(rich && { rich }),
  };
};

// The data gives the rich rate of the full base only: shared between its workers, like the normal rate.
const toRichHexite = (economy: EconomyStat[], workers: number) => {
  const perMin = readEconomyStat(economy, 'Hexite / min (rich)');
  const pitHexite = readEconomyStat(economy, 'Pit hexite (rich)');
  if (perMin === undefined || pitHexite === undefined || workers <= 0) return undefined;
  return { hexitePerWorkerPerMin: perMin / workers, pitHexite };
};

const toFluxHarvesterEconomy = (economy: EconomyStat[]): FluxHarvesterEconomy | undefined => {
  const fluxPerMin = readEconomyStat(economy, FLUX_PER_MIN);
  const harvestersPerNode = readEconomyStat(economy, 'Harvesters per node');
  if (fluxPerMin === undefined || harvestersPerNode === undefined) return undefined;
  return { kind: 'flux-harvester', fluxPerMin, harvestersPerNode };
};

// Exact label only: the '(rich)' variants are read on their own, 'Energy / min' is ignored.
const readEconomyStat = (economy: EconomyStat[], label: string) => {
  const value = economy.find((stat) => stat.label === label)?.value;
  return typeof value === 'number' ? value : undefined;
};

const hasEconomyStat = (economy: EconomyStat[] = [], label: string) => economy.some((stat) => stat.label === label);

const toHeroIds = ({ heroes }: SideSource) => (isStringList(heroes) ? heroes : []);

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const toSlug = (id: string) => id.slice(id.lastIndexOf('/') + 1);
