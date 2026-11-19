import { WAIT_REASONS } from './engine.constants.ts';
import { neverStarts, unknownStackRule, withHeroStart, withStep } from './engine.diagnostics.ts';
import { getSupplyCap, isSupplyChecked, toSeconds } from './engine.economy.ts';
import { getMissingResource } from './engine.starts.ts';
import { isRecruit, toStackGauge } from './engine.mercenaries.ts';
import { getLaneRank, toLaneId } from './engine.state.ts';
import type { NeverStartsCause } from './engine.diagnostics.ts';
import type { InstanceState, OrderState, PlannedStep, SimulationState } from './engine.internal.types.ts';
import type {
  Diagnostic,
  HeroSummary,
  Lane,
  OrderTiming,
  ResourceSample,
  SimulationContext,
  SimulationResult,
  StepTiming,
} from './engine.types.ts';

export const toSample = (state: SimulationState, context: SimulationContext): ResourceSample => ({
  t: toSeconds(state.tick),
  hexite: state.bank.hexite,
  flux: state.bank.flux,
  supplyUsed: state.supplyUsed,
  supplyCap: getSupplyCap(state.instances, context),
});

export const toResult = (
  plans: PlannedStep[],
  state: SimulationState,
  context: SimulationContext,
  extras: { samples: ResourceSample[]; globalDiagnostics: Diagnostic[]; heroes: HeroSummary },
): SimulationResult => {
  const orders = state.orders.map((order) => toOrderTiming(order, state));
  const steps = plans.map((plan) => toStepTiming(plan, state, context));
  const lanes = state.instances.map((instance) => toLane(instance, state, context));
  return {
    steps,
    orders,
    lanes,
    samples: extras.samples,
    endTime: Math.max(0, ...orders.map(({ endAt }) => endAt ?? 0)),
    supply: {
      used: state.supplyUsed,
      cap: getSupplyCap(state.instances, context),
      isChecked: isSupplyChecked(context.values, context.factionEntities),
    },
    diagnostics: [...extras.globalDiagnostics, ...steps.flatMap((step) => step.diagnostics)],
    heroes: extras.heroes,
  };
};

// An order outside any thread (unknown producer or research location) shows on the base lane.
const toOrderTiming = (order: OrderState, state: SimulationState): OrderTiming => ({
  stepUid: order.plan.uid,
  entityId: order.entity.id,
  occurrence: order.occurrence,
  laneId: toOrderLaneId(order, state),
  clickAt: toOptionalSeconds(order.clickTick),
  startAt: toOptionalSeconds(order.startTick),
  endAt: toOptionalSeconds(order.endTick),
  waits: toWaitSeconds(order.waits),
});

const toOrderLaneId = (order: OrderState, state: SimulationState) => {
  const instance = order.producer ?? order.created ?? (order.plan.thread === undefined ? state.instances.find(({ isStarting }) => isStarting) : undefined);
  return instance ? toLaneId(instance) : null;
};

// The step itself (occurrence 0): the copies of its loop are orders only.
const toStepTiming = (plan: PlannedStep, state: SimulationState, context: SimulationContext): StepTiming => {
  const order = state.ordersByUid.get(plan.uid);
  const timing = order ? toOrderTiming(order, state) : undefined;
  const isNotStarted = order !== undefined && order.startTick === undefined;
  const firstStart = plan.firstUid === undefined ? null : toOptionalSeconds(state.ordersByUid.get(plan.firstUid)?.startTick);
  const diagnostics = [
    ...plan.diagnostics.map((diagnostic) => withHeroStart(diagnostic, firstStart)),
    ...(order?.isBeyondStacks ? [unknownStackRule(context.values.mercenaryMaxStacks.value ?? 0)] : []),
    ...(order && isNotStarted ? [neverStarts(getNeverStartsCause(order, state, context))] : []),
  ];
  return {
    stepUid: plan.uid,
    clickAt: timing?.clickAt ?? null,
    startAt: timing?.startAt ?? null,
    endAt: isNotStarted ? null : (timing?.endAt ?? null),
    laneId: timing?.laneId ?? null,
    diagnostics: diagnostics.map((diagnostic) => withStep(diagnostic, plan.uid)),
  };
};

const getNeverStartsCause = (order: OrderState, state: SimulationState, context: SimulationContext): NeverStartsCause => {
  if (order.clickTick === undefined) return { kind: isRecruit(order) ? 'stack' : 'no-producer' };
  if (order.lastWait === 'supply') {
    return { kind: 'supply', used: state.supplyUsed, cap: getSupplyCap(state.instances, context) ?? 0 };
  }
  if (order.lastWait === 'producer-busy') return { kind: 'producer' };
  if (order.lastWait === 'requirement') return { kind: 'requirement' };
  if (order.lastWait === 'stack') return { kind: 'stack' };
  const missing = getMissingResource(state.bank, order.entity.cost);
  if (order.lastWait === 'reserved' || missing === undefined) return { kind: 'earlier-order' };
  return { kind: 'resource', resource: missing, amount: Math.ceil(order.entity.cost[missing] - state.bank[missing]) };
};

// 'Barracks #2': rank among the lanes of the same building, in lane order (Kieirra 2026-11-19).
const toLane = (instance: InstanceState, state: SimulationState, context: SimulationContext): Lane => {
  const sameOrigin = state.instances
    .filter(({ originalEntityId }) => originalEntityId === instance.originalEntityId)
    .sort((a, b) => getLaneRank(state, a) - getLaneRank(state, b));
  const name = context.catalog.get(instance.entityId)?.name ?? instance.entityId;
  return {
    id: toLaneId(instance),
    entityId: instance.entityId,
    originalEntityId: instance.originalEntityId,
    label: sameOrigin.length > 1 ? `${name} #${sameOrigin.indexOf(instance) + 1}` : name,
    isStarting: instance.isStarting,
    startAt: toSeconds(instance.startTick),
    readyAt: toSeconds(instance.readyTick),
    idle: getIdle(instance, state).map(({ from, to }) => ({ from: toSeconds(from), to: toSeconds(to) })),
    ...(instance.stacks ? { stacks: toStackGauge(instance.stacks) } : {}),
  };
};

// H9: gaps with an empty queue between the end of construction and the end of the last order.
// A mercenary building has no queue: no idle time.
const getIdle = (instance: InstanceState, state: SimulationState) => {
  if (instance.stacks) return [];
  const queued = state.orders.filter(({ producer, clickTick, plan }) => producer === instance && plan.thread === 'production' && clickTick !== undefined);
  const lastEnd = Math.max(...queued.map(({ endTick }) => endTick ?? -Infinity));
  if (!Number.isFinite(lastEnd)) return [];
  const busy = queued
    .map(({ clickTick = 0, endTick = state.tick }) => ({ from: clickTick, to: endTick }))
    .sort((a, b) => a.from - b.from);
  const idle: { from: number; to: number }[] = [];
  let cursor = instance.readyTick;
  for (const { from, to } of busy) {
    if (from > cursor) idle.push({ from: cursor, to: Math.min(from, lastEnd) });
    cursor = Math.max(cursor, to);
  }
  return idle.filter(({ from, to }) => to > from);
};

const toWaitSeconds = (waits: OrderState['waits']): OrderTiming['waits'] =>
  Object.fromEntries(
    WAIT_REASONS.flatMap((reason) => {
      const ticks = waits[reason];
      return ticks === undefined ? [] : [[reason, toSeconds(ticks)]];
    }),
  );

const toOptionalSeconds = (ticks?: number) => (ticks === undefined ? null : toSeconds(ticks));
