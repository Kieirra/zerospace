import { findLastFreeUnit, hasArmyInputs, takeUnits, toLaneRank } from './engine.army.ts';
import { RESOURCES } from './engine.constants.ts';
import { getSupplyCap, roundAmount } from './engine.economy.ts';
import { getOrderCost, getOrderDurationTicks } from './engine.effects.ts';
import { consumeStack, createStacks, hasStack, isRecruit, toChargeBoosts } from './engine.mercenaries.ts';
import { toMergeLaneId, toSupplyDelta } from './engine.merges.ts';
import { toNextCheckTick } from './engine.next-check.ts';
import { comparePlanOrder, flushWait, insertSorted } from './engine.order-lists.ts';
import { addInstance, areRequirementsReady, findFirstInLaneOrder, isReadyProducer } from './engine.state.ts';
import type { BuildEntity } from '../build-order.types.ts';
import type { CompareOrders } from './engine.order-lists.ts';
import type { InstanceState, OrderState, SimulationState, StartCheck } from './engine.internal.types.ts';
import type { Resource, SimulationContext } from './engine.types.ts';

// The resource missing the most for its cost; Hexite first on a tie. A resource it does not cost is never missing.
export const getMissingResource = (bank: Record<Resource, number>, cost: BuildEntity['cost']) => {
  let worst: Resource | undefined;
  for (const resource of RESOURCES) {
    if (cost[resource] <= 0 || bank[resource] >= cost[resource]) continue;
    if (worst === undefined || getLack(bank, cost, resource) > getLack(bank, cost, worst)) worst = resource;
  }
  return worst;
};

// Start priority (Kieirra 2026-11-19): class of `rules.startPriority`, then click tick, then index in its list.
export const toStartComparator = ({ rules }: SimulationContext): CompareOrders => {
  const toRank = (order: OrderState) => {
    const rank = rules.startPriority.value.indexOf(order.plan.rank);
    return rank === -1 ? rules.startPriority.value.length : rank;
  };
  return (a, b) => toRank(a) - toRank(b) || (a.clickTick ?? 0) - (b.clickTick ?? 0) || a.plan.tie - b.plan.tie;
};

// Phase 3: released orders start when their requirements, thread, supply and resources allow, in start priority order
// (`pending` is kept in that order). With strict reservation, the first order without its resources holds the start of
// every later one, a recruit aside: it starts only on money in the bank and never holds the others. A lack of supply or
// of stack never holds them either. When nothing was released, started or ended since the last full pass and every
// check gives the same reason, the pass is skipped; until the next tick at which a reason may change, even the checks.
export const startOrders = (state: SimulationState, context: SimulationContext) => {
  if (!state.hasPendingChanged && state.tick < state.nextCheckTick) return;
  const supplyCap = getSupplyCap(state.instances, context);
  const checks = state.pending.map((order) => checkStart(order, state, context, supplyCap));
  state.nextCheckTick = toNextCheckTick(state, context, checks);
  if (!state.hasPendingChanged && isSameReasons(checks, state.lastChecks)) return;
  state.lastChecks = checks;
  state.hasPendingChanged = false;
  state.lastFullPassTick = state.tick;
  const isStrict = context.rules.reservation.value === 'strict';
  let isBlocked = false;
  let hasStarted = false;
  let kept = 0;
  for (let index = 0; index < checks.length; index += 1) {
    const order = state.pending[index];
    // A start changes the bank and the supply used: the next checks are taken again.
    const check = hasStarted ? checkStart(order, state, context, supplyCap) : checks[index];
    if (check.reason === undefined && (!isBlocked || isRecruit(order))) {
      startOrder(order, state, context, check.instance);
      hasStarted = true;
      continue;
    }
    if (check.reason === 'hexite' || check.reason === 'flux') isBlocked ||= isStrict && !isRecruit(order);
    order.waitReason = check.reason ?? 'reserved';
    state.pending[kept] = order;
    kept += 1;
  }
  state.pending.length = kept;
};

const checkStart = (order: OrderState, state: SimulationState, context: SimulationContext, supplyCap: number | null): StartCheck => {
  const { plan, entity } = order;
  if (plan.kind === 'timed' && !areRequirementsReady(order, state, context)) return { reason: 'requirement' };
  const instance = plan.thread === 'research' ? findResearchInstance(order, state) : undefined;
  if (plan.thread === 'research' && !instance) return { reason: 'producer-busy' };
  if (!hasArmyInputs(order, state)) return { reason: 'units' };
  const supply = toOrderSupply(order, context);
  if (supplyCap !== null && supply > 0 && state.supplyUsed + supply > supplyCap) return { reason: 'supply' };
  if (usesStack(order) && order.producer && !hasStack(order.producer)) return { reason: 'stack' };
  return { reason: getMissingResource(state.bank, getOrderCost(entity, state)), instance };
};

// Research thread (Kieirra 2026-11-19): the pinned instance, else the first ready one in lane order whose research
// thread is free; a transformation takes an instance not transformed yet.
const findResearchInstance = (order: OrderState, state: SimulationState) => {
  const { producerUid } = order.plan;
  const pinned = producerUid === undefined ? undefined : state.instanceByUid.get(producerUid);
  const candidates = producerUid === undefined ? state.instances : pinned ? [pinned] : [];
  const isTransformation = order.entity.category === 'transformation';
  return findFirstInLaneOrder(
    state,
    candidates,
    (instance) =>
      instance.researchOrder === null &&
      isReadyProducer(instance, order, state.tick) &&
      !(isTransformation && instance.hasTransformation),
  );
};

const isSameReasons = (checks: StartCheck[], previous: (StartCheck | undefined)[]) =>
  checks.length === previous.length && checks.every((check, index) => check.reason === previous[index]?.reason);

const startOrder = (order: OrderState, state: SimulationState, context: SimulationContext, researchInstance?: InstanceState) => {
  const { entity, plan } = order;
  const cost = getOrderCost(entity, state);
  for (const resource of RESOURCES) state.bank[resource] = roundAmount(state.bank[resource] - cost[resource]);
  state.supplyUsed += toOrderSupply(order, context);
  order.startTick = state.tick;
  order.endTick = state.tick + getOrderDurationTicks(entity, state, context.rules);
  if (entity.category === 'merge') order.laneId = toMergeLaneId(takeUnits(state, order), (laneId) => toLaneRank(state, laneId));
  if (entity.category === 'replicate') order.laneId = findLastFreeUnit(state, entity.id)?.laneId;
  flushWait(order, state.tick);
  state.hasPendingChanged = true;
  insertSorted(state.running, order, comparePlanOrder);
  if (researchInstance) {
    researchInstance.researchOrder = order;
    order.producer = researchInstance;
    if (entity.category === 'transformation') researchInstance.hasTransformation = true;
  }
  if (plan.createsInstance) order.created = addInstance(state, entity, plan.uid, order.startTick, order.endTick);
  if (order.created && (entity.category === 'mercenary-building' || entity.productionCharges)) {
    const boosts = toChargeBoosts(entity.id, state.modifiers);
    order.created.stacks = createStacks(context.values, order.endTick, entity.productionCharges, boosts);
  }
  if (usesStack(order) && order.producer) consumeStack(order, order.producer, state.tick);
};

// A merge adds the supply its inputs did not have (US-009); any other order its own.
const toOrderSupply = ({ entity }: OrderState, context: SimulationContext) =>
  entity.category === 'merge' ? toSupplyDelta(entity, context.catalog) : entity.supply;

// A unit made on a building with stacks or charges spends one (a recruit, a Xol unit); never a research.
const usesStack = (order: OrderState) => order.plan.thread === 'production' && order.producer?.stacks !== undefined;

// Share of the cost still missing.
const getLack = (bank: Record<Resource, number>, cost: BuildEntity['cost'], resource: Resource) =>
  (cost[resource] - bank[resource]) / cost[resource];
