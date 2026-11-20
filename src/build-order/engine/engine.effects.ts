import { getMaxHarvesters, getSupplyCap, roundAmount, toHarvestersPerNode, toTicks } from './engine.economy.ts';
import type { BuildEntity, EffectTarget, MiscEffect, TargetMultiplier } from '../build-order.types.ts';
import type { OrderState, PlannedStep, ScheduledEffect, SimulationState } from './engine.internal.types.ts';
import type { SimulationContext } from './engine.types.ts';

// Misc steps (US-008): a talent or an event is no order. It is applied once its time has come, in (time, index in timed)
// order: no queue, no reservation, no start priority, and the loops never wait for it. Its multipliers only change the
// orders that start at its tick or later: the game reads them when an order starts.

export const createEffectSchedule = (plans: PlannedStep[]): ScheduledEffect[] =>
  plans
    .filter(isEffectPlan)
    .map((plan) => ({ plan, entity: plan.entity, atTick: plan.atTick ?? 0, supplyWaitTicks: 0, spawns: [] }))
    .sort((a, b) => a.atTick - b.atTick || a.plan.tie - b.plan.tie);

// A talent or an event with its entity: the effect schedule applies it.
const isEffectPlan = (plan: PlannedStep): plan is PlannedStep & { entity: BuildEntity } => plan.isEffect && plan.entity !== undefined;

// After the ends of the tick, before the starts: the effects whose time has come. A Reinforcements sees the supply of a
// building done at that tick; its whole group not fitting in the free supply, it waits and is tried again at the next tick.
export const applyDueEffects = (state: SimulationState, context: SimulationContext) => {
  const { effects } = state;
  for (let index = state.effectCursor; index < effects.length && effects[index].atTick <= state.tick; index += 1) {
    const effect = effects[index];
    if (effect.appliedTick !== undefined) continue;
    if (!fitsInSupply(effect, state, context)) {
      effect.supplyWaitTicks += 1;
      continue;
    }
    for (const change of effect.entity.effects ?? []) applyEffect(change, effect, state, context);
    effect.appliedTick = state.tick;
    state.hasPendingChanged = true;
  }
  while (state.effectCursor < effects.length && effects[state.effectCursor].appliedTick !== undefined) state.effectCursor += 1;
};

// Cost of an order that starts now: every cost multiplier that targets it, multiplied together.
export const getOrderCost = (entity: BuildEntity, state: SimulationState) => {
  const multiplier = toMultiplier(entity, state.modifiers.costs);
  if (multiplier === 1) return entity.cost;
  return { hexite: roundAmount(entity.cost.hexite * multiplier), flux: roundAmount(entity.cost.flux * multiplier) };
};

// Duration of an order that starts now. A mercenary recruit is instant: the duration of the data is ignored.
export const getOrderDurationTicks = (entity: BuildEntity, state: SimulationState) =>
  entity.category === 'mercenary-unit' ? 0 : toTicks((entity.duration ?? 0) * toMultiplier(entity, state.modifiers.durations));

// Unending Army, Hounds of War: one free unit each time an order of the trigger ends after the talent. A free unit is no
// order: it never triggers anything. A faction unit only, made in a building (Kieirra 2026-11-20): no harvester, no hero.
export const spawnOnFinish = ({ entity, producer }: OrderState, state: SimulationState) => {
  for (const { source, entity: unit, trigger } of state.modifiers.spawnOnFinish) {
    const isTriggered =
      trigger.kind === 'recruit-at'
        ? entity.category === 'mercenary-unit' && producer?.originalEntityId === trigger.producerId
        : entity.category === 'unit' && producer !== undefined && entity.sideId === source.entity.sideId;
    if (isTriggered) addSpawns(unit, 1, source, state);
  }
};

// Next tick an effect is due: the start checks are never skipped past it.
export const getNextEffectTick = (state: SimulationState) => {
  for (let index = state.effectCursor; index < state.effects.length; index += 1) {
    const { appliedTick, atTick } = state.effects[index];
    if (appliedTick === undefined && atTick > state.tick) return atTick;
  }
  return Infinity;
};

// An effect still to come keeps the simulation going; a Reinforcements held by the supply once every order is done never
// applies: nothing frees supply any more.
export const hasPendingEffects = (state: SimulationState) => getNextEffectTick(state) < Infinity;

// The game refuses Reinforcements unless the whole group fits in the free supply; unchecked supply never holds it.
const fitsInSupply = (effect: ScheduledEffect, state: SimulationState, context: SimulationContext) => {
  const supply = effect.entity.groupSupply ?? 0;
  if (supply <= 0) return true;
  const cap = getSupplyCap(state.instances, context);
  return cap === null || state.supplyUsed + supply <= cap;
};

const applyEffect = (change: MiscEffect, effect: ScheduledEffect, state: SimulationState, context: SimulationContext) => {
  const { modifiers } = state;
  switch (change.kind) {
    case 'flux-income':
      modifiers.fluxIncomePercent += change.percent;
      return;
    case 'cost':
      modifiers.costs.push(change);
      return;
    case 'duration':
      modifiers.durations.push(change);
      return;
    case 'grant':
      state.bank.hexite = roundAmount(state.bank.hexite + change.hexite);
      state.bank.flux = roundAmount(state.bank.flux + change.flux);
      return;
    case 'spawn-harvesters':
      spawnHarvesters(effect, state, context);
      return;
    case 'spawn-units': {
      const unit = context.catalog.get(change.entityId);
      if (unit) addSpawns(unit, change.count, effect, state);
      return;
    }
    case 'spawn-on-finish': {
      const unit = context.catalog.get(change.entityId);
      if (unit) modifiers.spawnOnFinish.push({ source: effect, entity: unit, trigger: change.trigger });
      return;
    }
    case 'building-copies':
      // A rule of the static analysis.
      return;
  }
};

// Free harvesters of the faction, one Flux node of them, never past its harvester cap (Lore of Flux:
// min(remaining cap, Harvesters per node)).
const spawnHarvesters = (effect: ScheduledEffect, state: SimulationState, context: SimulationContext) => {
  const harvester = context.factionEntities.find(({ category }) => category === 'harvester');
  if (!harvester) return;
  const count = toHarvestersPerNode(harvester);
  const max = getMaxHarvesters(harvester, context.values)?.max;
  const spawned = max === undefined ? count : Math.max(0, Math.min(count, max - state.harvesters.length));
  for (let index = 0; index < spawned; index += 1) state.harvesters.push(harvester);
  addSpawns(harvester, spawned, effect, state);
};

// Free units: no cost, no supply check, their supply counted, even over the cap.
const addSpawns = (unit: BuildEntity, count: number, effect: ScheduledEffect, state: SimulationState) => {
  state.supplyUsed += toSupplyPerUnit(unit) * count;
  for (let index = 0; index < count; index += 1) effect.spawns.push({ tick: state.tick, entityId: unit.id });
};

// A production is a pack of `count` units: a free unit is one of them.
const toSupplyPerUnit = ({ supply, count }: BuildEntity) => supply / count;

const toMultiplier = (entity: BuildEntity, modifiers: TargetMultiplier[]) =>
  modifiers.reduce((product, { target, multiplier }) => (matchesTarget(entity, target) ? product * multiplier : product), 1);

const matchesTarget = (entity: BuildEntity, { categories, entityIds }: EffectTarget) =>
  categories?.includes(entity.category) === true || entityIds?.includes(entity.id) === true;
