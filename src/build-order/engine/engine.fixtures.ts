// Test fixtures only: round numbers, injected values and rules.
import { toCatalogMap } from '../build-order.helpers.ts';
import { BASE_RULES } from '../rules/rules.data.ts';
import type { Build, BuildEntity, QueuedStep, TimedStep } from '../build-order.types.ts';
import type { ResolvedGameValues, ResolvedValue } from '../game-data/game-data.helpers.ts';
import type { GameRules, Reservation, StartRank } from '../rules/rules.data.ts';
import { simulateBuild } from './engine.ts';
import type { SimulationContext, SimulationResult } from './engine.types.ts';

// Declared first: the fixtures below are built at import time.
const toName = (id: string) =>
  id
    .slice(id.lastIndexOf('/') + 1)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const entity = (id: string, fields: Partial<BuildEntity> = {}): BuildEntity => {
  const name = toName(id);
  return {
    id: `test/${id}`,
    sideId: 'test',
    kind: 'unit',
    category: 'unit',
    name,
    displayName: name,
    cost: { hexite: 0, flux: 0 },
    count: 1,
    supply: 0,
    duration: 10,
    producedBy: [],
    requires: [],
    appliesTo: [],
    isVariant: false,
    ...fields,
  };
};

const buildingEntity = (id: string, fields: Partial<BuildEntity> = {}) =>
  entity(`building/${id}`, { kind: 'building', category: 'building', ...fields });

// 6 workers × 60 Hexite / min = 6 Hexite / s.
export const BASE = buildingEntity('base', {
  cost: { hexite: 400, flux: 0 },
  duration: 60,
  economy: {
    kind: 'hexite-base',
    workers: 6,
    hexitePerWorkerPerMin: 60,
    workerSpawnSeconds: 10,
    pitHexite: 1_000_000,
    depletedRatePercent: 25,
  },
});
export const BARRACKS = buildingEntity('barracks', { cost: { hexite: 60, flux: 0 }, duration: 30 });
export const LAB = buildingEntity('lab', { duration: 20 });
export const SUPPLY_PLATFORM = buildingEntity('supply-platform', { duration: 30, supplyProvided: 12 });
export const TURRET_PLATFORM = buildingEntity('turret-platform', { isVariant: true });
export const FLUX_VAULT = buildingEntity('flux-vault', { cost: { hexite: 0, flux: 25 } });
export const HEXITE_VAULT = buildingEntity('hexite-vault', { cost: { hexite: 60, flux: 0 } });
export const FREE_BUILDING = buildingEntity('free-building', { duration: 5 });

export const WORKER = entity('unit/worker', { cost: { hexite: 60, flux: 0 }, duration: 18, producedBy: [BASE.id] });
// 150 Flux / min = 2.5 Flux / s.
export const HARVESTER = entity('unit/harvester', {
  category: 'harvester',
  duration: 12,
  producedBy: [BASE.id],
  economy: { kind: 'flux-harvester', fluxPerMin: 150, harvestersPerNode: 2 },
});
export const SENTINEL = entity('unit/sentinel', {
  cost: { hexite: 75, flux: 75 },
  duration: 36,
  supply: 3,
  producedBy: [BARRACKS.id],
});
export const COMMANDO = entity('unit/commando', { supply: 2, producedBy: [BARRACKS.id] });
export const DRONE = entity('unit/drone', { producedBy: [LAB.id] });

export const RESEARCH = entity('upgrade/research', {
  kind: 'upgrade',
  category: 'research',
  duration: 15,
  requires: [LAB.id],
});
export const TRANSFORMATION = entity('upgrade/turret-platform', {
  kind: 'upgrade',
  category: 'transformation',
  appliesTo: [SUPPLY_PLATFORM.id],
  transformsInto: TURRET_PLATFORM.id,
});

export const ENTITIES = [
  BASE,
  BARRACKS,
  LAB,
  SUPPLY_PLATFORM,
  TURRET_PLATFORM,
  FLUX_VAULT,
  HEXITE_VAULT,
  FREE_BUILDING,
  WORKER,
  HARVESTER,
  SENTINEL,
  COMMANDO,
  DRONE,
  RESEARCH,
  TRANSFORMATION,
];

export const values = (overrides: Partial<ResolvedGameValues> = {}): ResolvedGameValues => ({
  startingHexite: known(0),
  startingFlux: known(0),
  startingHexiteWorkers: known('full'),
  startingSupply: unknown(),
  supplyCap: unknown(),
  passiveHexitePerMin: known(0),
  passiveFluxPerMin: known(0),
  maxFluxNodes: known(4),
  mercenaryMaxStacks: known(4),
  mercenaryInitialStacks: known(4),
  mercenaryStackRechargeSeconds: unknown(),
  supplyProvidedOverrides: {},
  researchLocations: {},
  ...overrides,
});

export const rules = (reservation: Reservation = 'strict', startPriority = BASE_RULES.startPriority.value): GameRules => ({
  ...BASE_RULES,
  reservation: { ...BASE_RULES.reservation, value: reservation },
  startPriority: { ...BASE_RULES.startPriority, value: startPriority as StartRank[] },
});

export const context = (
  options: { entities?: BuildEntity[]; values?: ResolvedGameValues; rules?: GameRules; heroPoolIds?: string[] } = {},
): SimulationContext => {
  const entities = options.entities ?? ENTITIES;
  return {
    catalog: toCatalogMap(entities),
    factionEntities: entities,
    startingBuildingId: BASE.id,
    rules: options.rules ?? rules(),
    values: options.values ?? values(),
    heroPoolIds: options.heroPoolIds ?? [],
  };
};

let uidCount = 0;

// Unique in a test file: a step found by its uid never meets another one.
const nextUid = () => {
  uidCount += 1;
  return `t${uidCount}`;
};

export const building = (entityId: string, at: number, uid?: string): TimedStep => ({ uid: uid ?? nextUid(), entityId, at });

export const research = (entityId: string, at: number): TimedStep => ({ uid: nextUid(), entityId, at });

export const transformation = (entityId: string, at: number, producerUid?: string): TimedStep => ({
  uid: nextUid(),
  entityId,
  at,
  ...(producerUid === undefined ? {} : { producerUid }),
});

export const unit = (entityId: string, producerUid?: string): QueuedStep => ({
  uid: nextUid(),
  entityId,
  ...(producerUid === undefined ? {} : { producerUid }),
});

export const recruit = (entityId: string, at?: number, producerUid?: string): QueuedStep => ({
  ...unit(entityId, producerUid),
  ...(at === undefined ? {} : { at }),
});

export const build = (timed: TimedStep[], queued: QueuedStep[] = [], overrides: Partial<Build> = {}): Build => ({
  version: 3,
  dataVersion: 'test',
  factionId: 'test',
  mercenaryId: null,
  heroId: null,
  title: '',
  author: '',
  timed,
  queued,
  ...overrides,
});

export const simulate = (timed: TimedStep[], queued: QueuedStep[] = [], simulationContext: SimulationContext = context()) =>
  simulateBuild(build(timed, queued), simulationContext);

export const orderOf = (result: SimulationResult, step: { uid: string }) => {
  const order = result.orders.find((timing) => timing.stepUid === step.uid);
  if (!order) throw new Error(`No order ${step.uid}`);
  return order;
};

export const stepOf = (result: SimulationResult, step: { uid: string }) => {
  const timing = result.steps.find((candidate) => candidate.stepUid === step.uid);
  if (!timing) throw new Error(`No step ${step.uid}`);
  return timing;
};

export const hasOrder = (result: SimulationResult, step: { uid: string }) => result.orders.some(({ stepUid }) => stepUid === step.uid);

export const codesOf = (result: SimulationResult, step: { uid: string }) => stepOf(result, step).diagnostics.map(({ code }) => code);

export const messagesOf = (result: SimulationResult, step: { uid: string }) =>
  stepOf(result, step).diagnostics.map(({ message }) => message);

export const withBank = (hexite: number, flux = 0, overrides: Parameters<typeof values>[0] = {}) =>
  context({ values: values({ startingHexite: known(hexite), startingFlux: known(flux), ...overrides }) });

export const known = <T>(value: T): ResolvedValue<T> => ({ value, isProvisional: false, label: 'Known value' });

export const unknown = <T>(): ResolvedValue<T> => ({ value: null, isProvisional: true, label: 'Unknown value' });
