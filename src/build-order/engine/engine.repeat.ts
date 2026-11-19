import type { OrderState, SimulationState } from './engine.internal.types.ts';

// Loops (D6): a unit with `repeat` is made again on the building that made it while a step outside the loops is not
// done. Once they are all done, the copies not started yet are cancelled; the copies in production finish. A copy
// goes at the end of `queued`: the units of the build go first on its building.

// At the end of the `finished` orders: one more copy of each loop, or the end of every loop.
export const requeueRepeats = (state: SimulationState, finished: OrderState[]) => {
  state.openCount -= finished.filter(({ plan }) => !plan.repeat).length;
  if (state.openCount > 0) {
    for (const order of finished) if (order.plan.repeat) requeueRepeat(state, order);
  } else {
    cancelWaitingCopies(state);
  }
};

// Pinned on the building that made the order, as soon as possible. Without a building (no producer in the build),
// no copy: nothing would ever end the loop but the horizon.
const requeueRepeat = (state: SimulationState, order: OrderState) => {
  const { producer } = order;
  if (!producer) return;
  const copy: OrderState = {
    plan: { ...order.plan, producerUid: producer.uid, atTick: undefined },
    entity: order.entity,
    occurrence: order.occurrence + 1,
    isDone: false,
    isReleased: false,
    waits: {},
  };
  state.orders.push(copy);
  state.queuedOrders.push(copy);
  state.hasPendingChanged = true;
};

// A copy waiting in `queued` or in its building leaves the simulation and frees the production thread it holds.
const cancelWaitingCopies = (state: SimulationState) => {
  const isWaitingCopy = (order: OrderState) => order.occurrence > 0 && order.startTick === undefined;
  if (!state.queuedOrders.some(isWaitingCopy) && !state.pending.some(isWaitingCopy)) return;
  for (const order of state.pending) {
    if (isWaitingCopy(order) && order.producer?.productionOrder === order) order.producer.productionOrder = null;
  }
  const isKept = (order: OrderState) => !isWaitingCopy(order);
  state.queuedOrders = state.queuedOrders.filter(isKept);
  state.pending = state.pending.filter(isKept);
  state.orders = state.orders.filter(isKept);
  state.hasPendingChanged = true;
};
