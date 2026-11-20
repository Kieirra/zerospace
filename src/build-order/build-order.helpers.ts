import { BASE_UID } from './build-order.types.ts';
import { getStartingBuildingId } from './catalog/catalog.helpers.ts';
import { WAIT_REASONS } from './engine/engine.constants.ts';
import { toTicks } from './engine/engine.economy.ts';
import type { Build, BuildCatalog, BuildEntity, EntityCategory, Side, TimedStep } from './build-order.types.ts';
import type { OrderTiming, WaitReason } from './engine/engine.types.ts';

export const formatClock = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const formatAmount = (value: number) => value.toLocaleString('en-US');

export const formatSupply = (supply: number) => String(Number(supply.toFixed(1)));

export const formatStepCount = (count: number) => `${count} ${count === 1 ? 'step' : 'steps'}`;

// '?' when the time is unknown.
export const toDurationLabel = (duration: number | null) => (duration === null ? '?' : formatClock(duration));

// ['75 Hexite', '25 Flux'], empty when free.
export const toCostParts = (cost: BuildEntity['cost']) => [
  ...(cost.hexite > 0 ? [`${formatAmount(cost.hexite)} Hexite`] : []),
  ...(cost.flux > 0 ? [`${formatAmount(cost.flux)} Flux`] : []),
];

export const toSideName = (sides: Side[], sideId: string | null) => sides.find(({ id }) => id === sideId)?.name ?? null;

export const getLongestWait = (waits: OrderTiming['waits']) =>
  WAIT_REASONS.reduce<WaitReason | undefined>((longest, reason) => {
    const seconds = waits[reason] ?? 0;
    return seconds > 0 && seconds > (longest === undefined ? 0 : (waits[longest] ?? 0)) ? reason : longest;
  }, undefined);

export const joinNames = (names: string[], conjunction: 'or' | 'and') =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;

export const toCatalogMap = (entities: BuildEntity[]): BuildCatalog =>
  new Map(entities.map((entity) => [entity.id, entity]));

export type StepKind = 'timed' | 'queued';

const QUEUED_CATEGORIES = new Set<EntityCategory>(['unit', 'harvester', 'hero', 'mercenary-unit', 'merge']);

// Units, harvesters, Altar heroes, recruits and merges are made as soon as possible; everything else has a click time.
export const toStepKind = ({ category }: Pick<BuildEntity, 'category'>): StepKind =>
  QUEUED_CATEGORIES.has(category) ? 'queued' : 'timed';

export const isBuildingCategory = ({ category }: Pick<BuildEntity, 'category'>) =>
  category === 'building' || category === 'mercenary-building';

// Talents and events (US-008): a click time, an effect applied by the engine, never an order.
export const isMiscCategory = ({ category }: Pick<BuildEntity, 'category'>) => category === 'talent' || category === 'event';

// A research or a talent goes once in a build.
export const isOncePerBuild = ({ category }: Pick<BuildEntity, 'category'>) => category === 'research' || category === 'talent';

// Copies of a mercenary building per match: the limit a talent among `entities` sets (Entrenched Hideouts), else `fallback`.
export const toBuildingCopies = (buildingId: string, entities: BuildEntity[], fallback: number) =>
  entities
    .flatMap(({ effects = [] }) => effects)
    .flatMap((effect) => (effect.kind === 'building-copies' && effect.entityId === buildingId ? [effect.copies] : []))[0] ?? fallback;

// A loop is a unit's only (a harvester has its cap, a recruit no duration, a merge or a copy its inputs), and a unit made
// in no time would loop forever in one tick, unless each of its producers waits for a charge (Xol, US-009).
export const canRepeat = (entity: BuildEntity, catalog: BuildCatalog) =>
  entity.category === 'unit' &&
  (toTicks(entity.duration ?? 0) > 0 ||
    (entity.producedBy.length > 0 && entity.producedBy.every((id) => catalog.get(id)?.productionCharges !== undefined)));

// Shared by the palette (disabled tiles), the reducer (invariant) and the engine analysis.
export const canProduce = (unit: Pick<BuildEntity, 'producedBy'>, producer: Pick<BuildEntity, 'id'>, transformedInto: string[]) =>
  unit.producedBy.includes(producer.id) || transformedInto.some((id) => unit.producedBy.includes(id));

export interface LaneProducer {
  // BASE_UID or the uid of the building TimedStep.
  uid: string;
  entity: BuildEntity;
  // Forms it may take through the transformations of the build (pinned on it, or Auto on its kind).
  transformedInto: string[];
}

// Stable sort by click time: the index in `timed` breaks the ties.
export const toLaneOrder = <T extends Pick<TimedStep, 'at'>>(timed: T[]) => [...timed].sort((a, b) => a.at - b.at);

// Every lane of the build in lane order: the starting base first, then the buildings by (at, index in timed).
export const toLaneProducers = (build: Pick<Build, 'timed'>, catalog: BuildCatalog): LaneProducer[] => {
  const startingId = getStartingBuildingId([...catalog.values()]);
  const starting = startingId === undefined ? undefined : catalog.get(startingId);
  const buildings = toLaneOrder(build.timed).flatMap(({ uid, entityId }) => {
    const entity = catalog.get(entityId);
    return entity && isBuildingCategory(entity) ? [{ uid, entity }] : [];
  });
  const transformations = build.timed.flatMap((step) => {
    const entity = catalog.get(step.entityId);
    return entity?.category === 'transformation' && entity.transformsInto ? [{ step, entity, into: entity.transformsInto }] : [];
  });
  return [...(starting ? [{ uid: BASE_UID, entity: starting }] : []), ...buildings].map((lane) => ({
    ...lane,
    transformedInto: transformations
      .filter(({ step, entity }) =>
        step.producerUid === undefined ? entity.appliesTo.includes(lane.entity.id) : step.producerUid === lane.uid,
      )
      .map(({ into }) => into),
  }));
};

// Lanes of the build able to make the unit, in lane order.
export const toCapableProducerUids = (unit: BuildEntity, build: Pick<Build, 'timed'>, catalog: BuildCatalog) =>
  toLaneProducers(build, catalog)
    .filter(({ entity, transformedInto }) => canProduce(unit, entity, transformedInto))
    .map(({ uid }) => uid);

// The lane `laneUid` of the build can make the unit.
export const canProduceOn = (unit: BuildEntity, laneUid: string, build: Pick<Build, 'timed'>, catalog: BuildCatalog) =>
  toCapableProducerUids(unit, build, catalog).includes(laneUid);
