import { BASE_UID } from '../build-order.types.ts';
import { isRequirementMet } from './engine.analysis.ts';
import { LANE_ID_PREFIX } from './engine.constants.ts';
import { createHexiteMine, getStartingWorkers } from './engine.economy.ts';
import { createEffectSchedule } from './engine.effects.ts';
import type { BuildEntity } from '../build-order.types.ts';
import type { InstanceState, OrderState, PlannedStep, SimulationState } from './engine.internal.types.ts';
import type { SetupHero, SimulationContext } from './engine.types.ts';

export const createState = (
  plans: PlannedStep[],
  context: SimulationContext,
  setupHero: SetupHero | null = null,
): SimulationState => {
  const orders = plans.filter(hasOrder).map(createOrder);
  const timedOrders = orders
    .filter(({ plan }) => plan.kind === 'timed')
    .sort((a, b) => (a.plan.atTick ?? 0) - (b.plan.atTick ?? 0) || a.plan.tie - b.plan.tie);
  const state: SimulationState = {
    tick: 0,
    bank: { hexite: context.values.startingHexite.value ?? 0, flux: context.values.startingFlux.value ?? 0 },
    supplyUsed: 0,
    instances: [],
    instanceByUid: new Map(),
    laneRank: toLaneRank(timedOrders),
    harvesters: [],
    orders,
    ordersByUid: new Map(orders.map((order) => [order.plan.uid, order])),
    timedOrders,
    timedCursor: 0,
    queuedOrders: orders.filter(({ plan }) => plan.kind === 'queued'),
    pending: [],
    hasPendingChanged: false,
    lastChecks: [],
    lastFullPassTick: -1,
    nextCheckTick: 0,
    running: [],
    openCount: orders.filter(({ plan }) => !plan.repeat).length,
    setupHero,
    effects: createEffectSchedule(plans),
    effectCursor: 0,
    modifiers: { fluxIncomePercent: 0, costs: [], durations: [], spawnOnFinish: [], productionCharges: [] },
    army: new Map(),
  };
  const starting = context.startingBuildingId ? context.catalog.get(context.startingBuildingId) : undefined;
  if (starting) addStartingInstance(state, starting, context);
  return state;
};

// A building instance exists from the start of its construction and is ready at its end.
export const addInstance = (state: SimulationState, entity: BuildEntity, uid: string, startTick: number, readyTick: number) => {
  const instance: InstanceState = {
    uid,
    originalEntityId: entity.id,
    entityId: entity.id,
    ids: new Set([entity.id]),
    isStarting: false,
    startTick,
    readyTick,
    isComplete: false,
    productionOrder: null,
    researchOrder: null,
    hasTransformation: false,
    mine: entity.economy?.kind === 'hexite-base' ? createHexiteMine(entity.economy, readyTick) : undefined,
  };
  state.instances.push(instance);
  state.instanceByUid.set(uid, instance);
  return instance;
};

// Stable across edits: a lane keeps its id when its building moves in time (Kieirra 2026-11-19).
export const toLaneId = (instance: Pick<InstanceState, 'uid'>) => `${LANE_ID_PREFIX}${instance.uid}`;

// Lane order of an instance: the base first, then (at, index in timed).
export const getLaneRank = (state: SimulationState, instance: InstanceState) => state.laneRank.get(instance.uid) ?? Infinity;

// First candidate in lane order that passes `isFree`.
export const findFirstInLaneOrder = (
  state: SimulationState,
  candidates: InstanceState[],
  isFree: (instance: InstanceState) => boolean,
) =>
  candidates.reduce<InstanceState | undefined>(
    (best, instance) =>
      isFree(instance) && (best === undefined || getLaneRank(state, instance) < getLaneRank(state, best)) ? instance : best,
    undefined,
  );

const isReady = (instance: InstanceState, tick: number) => instance.readyTick <= tick;

export const hasReadyId = (state: SimulationState, id: string) =>
  state.instances.some((instance) => isReady(instance, state.tick) && instance.ids.has(id));

// The requirements of the order are finished at this tick, read in the mode of its kind.
export const areRequirementsReady = ({ plan, entity }: Pick<OrderState, 'plan' | 'entity'>, state: SimulationState, context: SimulationContext) =>
  isRequirementMet(plan.requires, context.rules.requiresMode[entity.kind].value, (id) => hasReadyId(state, id));

// Built instance with one of the ids that can take the order.
export const isReadyProducer = (instance: InstanceState, order: OrderState, tick: number) =>
  isReady(instance, tick) && order.plan.producerIds.some((id) => instance.ids.has(id));

const toLaneRank = (timedOrders: OrderState[]) =>
  new Map([BASE_UID, ...timedOrders.filter(({ plan }) => plan.createsInstance).map(({ plan }) => plan.uid)].map((uid, rank) => [uid, rank]));

// A talent or an event is no order: the effect schedule applies it.
const hasOrder = (plan: PlannedStep): plan is PlannedStep & { entity: BuildEntity } =>
  plan.entity !== undefined && !plan.isIgnored && !plan.isEffect;

const createOrder = (plan: PlannedStep & { entity: BuildEntity }): OrderState => ({
  plan,
  entity: plan.entity,
  occurrence: 0,
  isDone: false,
  isReleased: false,
  waits: {},
});

// The starting base (B1) sits on a rich Hexite spot, whatever the faction (Mazar 2026-11-17).
const addStartingInstance = (state: SimulationState, entity: BuildEntity, context: SimulationContext) => {
  const instance = addInstance(state, entity, BASE_UID, 0, 0);
  instance.isStarting = true;
  instance.isComplete = true;
  if (entity.economy?.kind === 'hexite-base') {
    instance.mine = createHexiteMine(entity.economy, 0, getStartingWorkers(entity.economy, context.values), true);
  }
};
