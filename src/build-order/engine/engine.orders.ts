import { hasStack, isRecruit } from './engine.mercenaries.ts';
import { flushWait, insertSorted } from './engine.order-lists.ts';
import { requeueRepeats } from './engine.repeat.ts';
import { startOrders, toStartComparator } from './engine.starts.ts';
import { areRequirementsReady, findFirstInLaneOrder, isReadyProducer } from './engine.state.ts';
import type { InstanceState, OrderState, SimulationState } from './engine.internal.types.ts';
import type { SimulationContext } from './engine.types.ts';

// Phase 1: orders whose end has come leave their thread and apply their effect, in plan order, then the loops go on or
// stop (`requeueRepeats`); returns how many ended.
export const finishOrders = (state: SimulationState) => {
  const { running } = state;
  const finished: OrderState[] = [];
  let kept = 0;
  for (const order of running) {
    if (order.endTick === undefined || order.endTick > state.tick) {
      running[kept] = order;
      kept += 1;
      continue;
    }
    order.isDone = true;
    finished.push(order);
    const { producer, created, entity } = order;
    if (producer?.productionOrder === order) producer.productionOrder = null;
    if (producer?.researchOrder === order) producer.researchOrder = null;
    if (created) created.isComplete = true;
    if (entity.category === 'harvester') state.harvesters.push(entity);
    if (entity.category === 'transformation' && entity.transformsInto && producer) {
      producer.ids.add(entity.transformsInto);
      producer.entityId = entity.transformsInto;
    }
  }
  running.length = kept;
  if (finished.length === 0) return 0;
  requeueRepeats(state, finished);
  state.hasPendingChanged = true;
  return finished.length;
};

// Phases 1 to 3, repeated in the same tick while an order ends (a 0 s order ends in the tick it starts) or is
// released: the copy of a loop starts in the tick its previous one ends. The last start pass tells why each released
// order still waits.
export const releaseAndStartOrders = (state: SimulationState, context: SimulationContext) => {
  releaseTimed(state, context);
  releaseQueued(state, context);
  startOrders(state, context);
  while (finishOrders(state) + releaseTimed(state, context) + releaseQueued(state, context) > 0) startOrders(state, context);
};

// A wait counts the interval [tick, tick + 1), like the income. Reasons change only in a full start pass:
// each order keeps a run (`lastWait` since `waitSince`) counted when its reason changes, it starts or the
// simulation ends.
export const recordWaits = (state: SimulationState) => {
  if (state.lastFullPassTick !== state.tick) return;
  for (const order of state.pending) {
    if ((order.clickTick ?? 0) > state.tick) continue;
    const reason = order.waitReason ?? 'producer-busy';
    if (order.lastWait === reason && order.waitSince !== undefined) continue;
    flushWait(order, state.tick);
    order.lastWait = reason;
    order.waitSince = state.tick;
  }
};

// Counts the runs of the orders still waiting when the simulation stops.
export const flushWaits = (state: SimulationState) => {
  for (const order of state.pending) flushWait(order, state.tick);
};

// Timed orders whose click time has come wait to start, in (atTick, tie) order (Kieirra 2026-11-19).
const releaseTimed = (state: SimulationState, context: SimulationContext) => {
  let released = 0;
  while (state.timedCursor < state.timedOrders.length && (state.timedOrders[state.timedCursor].plan.atTick ?? 0) <= state.tick) {
    release(state.timedOrders[state.timedCursor], state, context);
    state.timedCursor += 1;
    released += 1;
  }
  return released;
};

// Walks `queued` in order (Kieirra 2026-11-19). A unit with a time `at` is not released before it, and holds no one
// meanwhile: the next units of its lane may go first. A pinned unit takes its lane once built, its production thread
// free and no older unit pinned there still waiting; an Auto unit takes the first capable lane with a free production
// thread, in lane order. Once in, it holds the thread until its end, waits for resources included. Nothing can be
// released between two events: skipped then, like the start checks.
const releaseQueued = (state: SimulationState, context: SimulationContext) => {
  if (state.queuedOrders.length === 0 || (!state.hasPendingChanged && state.tick < state.nextCheckTick)) return 0;
  const heldLanes = new Set<string>();
  let released = 0;
  state.queuedOrders = state.queuedOrders.filter((order) => {
    if (isBeforeItsTime(order, state)) return true;
    const isReleased = tryRelease(order, state, context, heldLanes);
    if (isReleased) released += 1;
    else if (order.plan.producerUid !== undefined) heldLanes.add(order.plan.producerUid);
    return !isReleased;
  });
  return released;
};

const release = (order: OrderState, state: SimulationState, context: SimulationContext) => {
  order.isReleased = true;
  order.clickTick = state.tick;
  insertSorted(state.pending, order, toStartComparator(context));
  state.hasPendingChanged = true;
};

const tryRelease = (order: OrderState, state: SimulationState, context: SimulationContext, heldLanes: Set<string>) => {
  const { plan } = order;
  if (!areRequirementsReady(order, state, context)) return false;
  if (plan.thread !== undefined) {
    const instance = plan.producerUid === undefined ? findAutoInstance(order, state) : findPinnedInstance(order, state, heldLanes);
    if (!instance) return false;
    instance.productionOrder = order;
    order.producer = instance;
  }
  release(order, state, context);
  return true;
};

const isBeforeItsTime = ({ plan }: OrderState, state: SimulationState) => plan.atTick !== undefined && plan.atTick > state.tick;

// A recruit also needs a stack of that building to be released.
const canTake = (instance: InstanceState, order: OrderState, state: SimulationState) =>
  instance.productionOrder === null &&
  isReadyProducer(instance, order, state.tick) &&
  (!isRecruit(order) || hasStack(instance));

const findPinnedInstance = (order: OrderState, state: SimulationState, heldLanes: Set<string>) => {
  const uid = order.plan.producerUid;
  const instance = uid === undefined || heldLanes.has(uid) ? undefined : state.instanceByUid.get(uid);
  return instance && canTake(instance, order, state) ? instance : undefined;
};

const findAutoInstance = (order: OrderState, state: SimulationState) =>
  findFirstInLaneOrder(state, state.instances, (instance) => canTake(instance, order, state));
