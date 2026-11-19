import { toCatalogMap } from '../build-order.helpers.ts';
import { getHeroPool, getStartingBuildingId } from '../catalog/catalog.helpers.ts';
import { resolveGameValues } from '../game-data/game-data.helpers.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { analyzeBuild } from './engine.analysis.ts';
import { HORIZON_SECONDS, MIN_SAMPLED_SECONDS, TICK_PER_SECOND } from './engine.constants.ts';
import { fluxNodesUnknown, supplyNotChecked } from './engine.diagnostics.ts';
import { collectIncome, isSupplyChecked, toTicks } from './engine.economy.ts';
import { getHeroDiagnostics, getSetupHeroTick, resolveHeroSlots, spawnSetupHero } from './engine.heroes.ts';
import { getMercenaryDiagnostics, rechargeStacks } from './engine.mercenaries.ts';
import { areAllOrdersDone } from './engine.order-lists.ts';
import { finishOrders, flushWaits, recordWaits, releaseAndStartOrders } from './engine.orders.ts';
import { toResult, toSample } from './engine.results.ts';
import { createState } from './engine.state.ts';
import type { Build, SideCatalog } from '../build-order.types.ts';
import type { PlannedStep, SimulationState } from './engine.internal.types.ts';
import type { Diagnostic, ResourceSample, SimulationContext } from './engine.types.ts';

export const createSimulationContext = (
  build: Build,
  factionCatalog: SideCatalog,
  mercenaryCatalog: SideCatalog | null,
): SimulationContext => {
  const rules = resolveRules(build.factionId);
  return {
    catalog: toCatalogMap([...factionCatalog.entities, ...(mercenaryCatalog?.entities ?? [])]),
    factionEntities: factionCatalog.entities,
    startingBuildingId: getStartingBuildingId(factionCatalog.entities),
    rules,
    values: resolveGameValues(build.factionId, build.mercenaryId),
    heroPoolIds: getHeroPool(factionCatalog.side, mercenaryCatalog?.side ?? null, rules).map(({ heroId }) => heroId),
  };
};

// Fixed step loop: ends (setup hero, stack recharge) → releases → starts (repeated) → sample → waits → income,
// until every order is done or the horizon. Waits and income count the interval [tick, tick + 1),
// so none is counted at the horizon.
export const simulateBuild = (build: Build, context: SimulationContext) => {
  const heroSlots = resolveHeroSlots(build, context);
  const plans = analyzeBuild(build, context, heroSlots);
  const state = createState(plans, context, heroSlots.setup);
  const samples: ResourceSample[] = [];
  const horizon = toTicks(HORIZON_SECONDS);
  for (let tick = 0; tick <= horizon; tick += 1) {
    state.tick = tick;
    finishOrders(state);
    spawnSetupHero(state);
    rechargeStacks(state);
    releaseAndStartOrders(state, context);
    if (tick % TICK_PER_SECOND === 0) samples.push(toSample(state, context));
    if (isOver(state) || tick === horizon) break;
    recordWaits(state);
    collectIncome(state, context);
  }
  flushWaits(state);
  return toResult(plans, state, context, {
    samples,
    globalDiagnostics: getGlobalDiagnostics(build, plans, context),
    heroes: { setup: heroSlots.setup },
  });
};

// Every order done, and samples taken up to the whole second after the last end and the setup hero, one minute at least.
const isOver = (state: SimulationState) => {
  if (!areAllOrdersDone(state)) return false;
  const lastEnd = Math.max(toTicks(MIN_SAMPLED_SECONDS), getSetupHeroTick(state), ...state.orders.map(({ endTick = 0 }) => endTick));
  return state.tick >= Math.ceil(lastEnd / TICK_PER_SECOND) * TICK_PER_SECOND;
};

const getGlobalDiagnostics = (build: Build, plans: PlannedStep[], context: SimulationContext) => {
  const diagnostics: Diagnostic[] = [...getHeroDiagnostics(build, context), ...getMercenaryDiagnostics(build, context)];
  if (!isSupplyChecked(context.values, context.factionEntities)) diagnostics.push(supplyNotChecked());
  const harvesterCount = plans.filter(({ entity, isIgnored }) => entity?.category === 'harvester' && !isIgnored).length;
  if (context.values.maxFluxNodes.value === null && harvesterCount > 0) {
    diagnostics.push(fluxNodesUnknown(harvesterCount));
  }
  return diagnostics;
};
