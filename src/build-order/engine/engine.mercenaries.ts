import { toSeconds, toTicks } from './engine.economy.ts';
import type { ProductionCharges } from '../../wiki/wiki-data.types.ts';
import type { ProductionChargesBoost } from '../build-order.types.ts';
import type { ResolvedGameValues } from '../game-data/game-data.helpers.ts';
import type { InstanceState, Modifiers, OrderState, SimulationState, StackState } from './engine.internal.types.ts';
import type { SimulationContext, StackGauge } from './engine.types.ts';

// Stacks of a mercenary building or charges of a Xol producer (US-009), received when it is ready: the charges of the
// data, else the game values; raised by the boosts in force (Overclocked Production).
export const createStacks = (
  values: ResolvedGameValues,
  readyTick: number,
  charges?: ProductionCharges,
  boosts: ProductionChargesBoost[] = [],
): StackState => {
  const max = boosts.reduce((total, { maxDelta }) => total + maxDelta, charges?.max ?? values.mercenaryMaxStacks.value ?? 0);
  const baseRecharge = charges?.recharge ?? values.mercenaryStackRechargeSeconds.value;
  const recharge = baseRecharge === null ? null : boosts.reduce((seconds, { rechargeMultiplier }) => seconds * rechargeMultiplier, baseRecharge);
  const rechargeTicks = recharge === null ? null : toTicks(recharge);
  const count = Math.min(charges?.initial ?? values.mercenaryInitialStacks.value ?? max, max);
  return {
    count,
    max,
    rechargeTicks,
    nextTick: rechargeTicks !== null && count < max ? readyTick + rechargeTicks : undefined,
    isKnown: charges !== undefined || isStackRuleKnown(values),
    points: [{ tick: readyTick, count }],
  };
};

// Phase 1: +1 stack per recharge, up to the max.
export const rechargeStacks = (state: SimulationState) => {
  for (const { stacks } of state.instances) {
    if (stacks) advanceStacks(stacks, state.tick);
  }
};

export const isRecruit = (order: OrderState) => order.entity.category === 'mercenary-unit';

// The production charge boosts in force for a producer.
export const toChargeBoosts = (producerId: string, modifiers: Modifiers) =>
  modifiers.productionCharges.filter(({ entityIds }) => entityIds.includes(producerId));

// A boost applies to the producers completed after it (Kieirra 2026-11-20): one still being built gets its charges again.
export const boostUnfinishedStacks = (state: SimulationState, context: SimulationContext) => {
  for (const instance of state.instances) {
    const entity = context.catalog.get(instance.originalEntityId);
    if (instance.isComplete || !instance.stacks || !entity) continue;
    instance.stacks = createStacks(context.values, instance.readyTick, entity.productionCharges, toChargeBoosts(entity.id, state.modifiers));
  }
};

// A recruit, or a Xol unit (US-009), spends a stack of the building it is given to, never another one (Kieirra
// 2026-11-19). Unknown recharge: a recruit beyond the stacks is still launched.
export const hasStack = ({ stacks }: InstanceState) =>
  stacks !== undefined && (stacks.count > 0 || stacks.rechargeTicks === null);

// Unknown recharge: the recruit beyond the stacks is still launched, and flagged.
export const consumeStack = (order: OrderState, instance: InstanceState, tick: number) => {
  const { stacks } = instance;
  if (!stacks) return;
  if (stacks.count === 0) order.isBeyondStacks = true;
  stacks.count = Math.max(0, stacks.count - 1);
  if (stacks.rechargeTicks !== null) stacks.nextTick ??= tick + stacks.rechargeTicks;
  stacks.points.push({ tick, count: stacks.count });
};

export const toStackGauge = (stacks: StackState): StackGauge => ({
  max: stacks.max,
  isKnown: stacks.isKnown,
  points: stacks.points.map(({ tick, count }) => ({ t: toSeconds(tick), count })),
});

const advanceStacks = (stacks: StackState, tick: number) => {
  while (stacks.rechargeTicks !== null && stacks.nextTick !== undefined && stacks.nextTick <= tick) {
    stacks.count = Math.min(stacks.max, stacks.count + 1);
    stacks.points.push({ tick: stacks.nextTick, count: stacks.count });
    stacks.nextTick = stacks.count < stacks.max ? stacks.nextTick + stacks.rechargeTicks : undefined;
  }
};

const isStackRuleKnown = (values: ResolvedGameValues) =>
  !values.mercenaryInitialStacks.isProvisional && !values.mercenaryStackRechargeSeconds.isProvisional;
