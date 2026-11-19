import { PERCENT, RESOURCES } from './engine.constants.ts';
import { getFluxPerTick, perTick } from './engine.economy.ts';
import { getSetupHeroTick } from './engine.heroes.ts';
import type { OrderState, SimulationState, StartCheck } from './engine.internal.types.ts';
import type { Resource, SimulationContext } from './engine.types.ts';

// First tick at which a start check may give another reason than in the last full pass, or a queued order may be
// released, when nothing is released, started or ended before (those always run a full pass). Between the two, the
// bank only grows at the current rate: a resource wait ends no earlier than this rate says. A worker spawn, a mercenary
// stack, the setup hero, a click time or the time `at` of a queued step change it without such an event, so their
// ticks bound it too. An emptying pit only slows the income: the check comes early, never late. With an order ready
// to start but held, no skip.
export const toNextCheckTick = (state: SimulationState, context: SimulationContext, checks: StartCheck[]) => {
  const next = state.tick + 1;
  const income = getIncomePerTick(state, context);
  let earliest = getNextEventTick(state);
  for (let index = 0; index < checks.length; index += 1) {
    const { reason } = checks[index];
    if (reason === undefined) return next;
    if (reason !== 'hexite' && reason !== 'flux') continue;
    earliest = Math.min(earliest, getResourceChangeTick(state.pending[index], state, income));
    if (earliest <= next) return next;
  }
  return Math.max(next, earliest);
};

// Without the next click time, a building could start late with no error to show (Kieirra 2026-11-19).
const getNextEventTick = (state: SimulationState) => {
  let tick = Infinity;
  for (const { mine, stacks } of state.instances) {
    if (mine && mine.workers < mine.economy.workers) tick = Math.min(tick, mine.nextWorkerTick);
    if (stacks?.nextTick !== undefined) tick = Math.min(tick, stacks.nextTick);
  }
  const nextTimed = state.timedOrders[state.timedCursor]?.plan.atTick;
  if (nextTimed !== undefined) tick = Math.min(tick, nextTimed);
  for (const { plan } of state.queuedOrders) {
    if (plan.atTick !== undefined && plan.atTick > state.tick) tick = Math.min(tick, plan.atTick);
  }
  const heroTick = getSetupHeroTick(state);
  return heroTick > state.tick ? Math.min(tick, heroTick) : tick;
};

// Tick at which the missing resource of the order may change: one lacking resource gets paid. With two lacking,
// the one missing the most may change before: checked every tick.
const getResourceChangeTick = (order: OrderState, state: SimulationState, income: Record<Resource, number>) => {
  const lacking = RESOURCES.filter((resource) => order.entity.cost[resource] > 0 && state.bank[resource] < order.entity.cost[resource]);
  if (lacking.length !== 1) return state.tick + 1;
  const [resource] = lacking;
  if (income[resource] <= 0) return Infinity;
  // One tick early: the amounts are rounded every tick.
  return state.tick + Math.max(1, Math.floor((order.entity.cost[resource] - state.bank[resource]) / income[resource]) - 1);
};

// Income of the current tick: the mines of the ready bases, the harvesters and the passive income.
const getIncomePerTick = (state: SimulationState, context: SimulationContext): Record<Resource, number> => {
  const { passiveHexitePerMin, passiveFluxPerMin } = context.values;
  const mined = state.instances.reduce((total, { mine, readyTick }) => {
    if (!mine || readyTick > state.tick) return total;
    const rate = perTick(mine.workers * mine.economy.hexitePerWorkerPerMin);
    return total + (mine.pitRemaining > 0 ? rate : (rate * mine.economy.depletedRatePercent) / PERCENT);
  }, 0);
  return {
    hexite: mined + perTick(passiveHexitePerMin.value ?? 0),
    flux: getFluxPerTick(state.harvesters) + perTick(passiveFluxPerMin.value ?? 0),
  };
};
