import type { OrderState, SimulationState } from './engine.internal.types.ts';

// Working lists of the simulation, kept up to date so that a tick never walks every order of the build.

export type CompareOrders = (a: OrderState, b: OrderState) => number;

// Order of the plans: the timed steps, then the queued ones.
export const comparePlanOrder: CompareOrders = (a, b) => a.plan.index - b.plan.index;

// Inserts after every order that does not come after it: the list stays sorted as a stable sort would leave it.
export const insertSorted = (list: OrderState[], order: OrderState, compare: CompareOrders) => {
  let low = 0;
  let high = list.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (compare(list[middle], order) <= 0) low = middle + 1;
    else high = middle;
  }
  list.splice(low, 0, order);
};

// Adds the ticks waited since `waitSince` for `lastWait` (a wait run is counted at its end).
export const flushWait = (order: OrderState, tick: number) => {
  const { lastWait, waitSince } = order;
  if (lastWait === undefined || waitSince === undefined) return;
  if (tick > waitSince) order.waits[lastWait] = (order.waits[lastWait] ?? 0) + tick - waitSince;
  order.waitSince = tick;
};

// Every timed order released, every queued order in a thread, nothing waiting or running.
export const areAllOrdersDone = (state: SimulationState) =>
  state.timedCursor >= state.timedOrders.length &&
  state.queuedOrders.length === 0 &&
  state.pending.length === 0 &&
  state.running.length === 0;
