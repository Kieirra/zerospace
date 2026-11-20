import { toCatalogMap } from '../build-order.helpers.ts';
import { getHeroPool, getStartingBuildingId } from '../catalog/catalog.helpers.ts';
import { withFactionValues } from '../catalog/catalog.misc.ts';
import { resolveGameValues } from '../game-data/game-data.helpers.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { analyzeBuild } from './engine.analysis.ts';
import { HORIZON_SECONDS, MIN_SAMPLED_SECONDS, TICK_PER_SECOND } from './engine.constants.ts';
import { fluxNodesUnknown, supplyNotChecked } from './engine.diagnostics.ts';
import { collectIncome, isSupplyChecked, toTicks } from './engine.economy.ts';
import { applyDueEffects, hasPendingEffects } from './engine.effects.ts';
import { getHeroDiagnostics, getSetupHeroTick, resolveHeroSlots, spawnSetupHero } from './engine.heroes.ts';
import { rechargeStacks } from './engine.mercenaries.ts';
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
    catalog: toCatalogMap(withFactionValues([...factionCatalog.entities, ...(mercenaryCatalog?.entities ?? [])], factionCatalog.entities)),
    factionEntities: factionCatalog.entities,
    startingBuildingId: getStartingBuildingId(factionCatalog.entities),
    rules,
    values: resolveGameValues(build.factionId, build.mercenaryId),
    heroPoolIds: getHeroPool(factionCatalog.side, mercenaryCatalog?.side ?? null, rules).map(({ heroId }) => heroId),
  };
};

// Fixed step loop: ends (setup hero, stack recharge) → talents and events due → releases → starts (repeated) → sample →
// waits → income, until every order is done or the horizon. Waits and income count the interval [tick, tick + 1),
// so none is counted at the horizon. `minSampledSeconds` keeps sampling the resources until then, horizon at most.
export const simulateBuild = (build: Build, context: SimulationContext, options?: { minSampledSeconds?: number }) => {
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
    applyDueEffects(state, context);
    releaseAndStartOrders(state, context);
    if (tick % TICK_PER_SECOND === 0) samples.push(toSample(state, context));
    if (isOver(state, options?.minSampledSeconds ?? MIN_SAMPLED_SECONDS) || tick === horizon) break;
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

// Every order done, no talent or event still to come, and samples taken up to the whole second after the last end, the
// last effect applied and the setup hero, one minute at least.
const isOver = (state: SimulationState, minSampledSeconds: number) => {
  if (!areAllOrdersDone(state) || hasPendingEffects(state)) return false;
  const lastEnd = Math.max(
    toTicks(minSampledSeconds),
    getSetupHeroTick(state),
    ...state.orders.map(({ endTick = 0 }) => endTick),
    ...state.effects.map(({ appliedTick = 0 }) => appliedTick),
  );
  return state.tick >= Math.ceil(lastEnd / TICK_PER_SECOND) * TICK_PER_SECOND;
};

const getGlobalDiagnostics = (build: Build, plans: PlannedStep[], context: SimulationContext) => {
  const diagnostics: Diagnostic[] = getHeroDiagnostics(build, context);
  if (!isSupplyChecked(context.values, context.factionEntities)) diagnostics.push(supplyNotChecked());
  const harvesterCount = plans.filter(({ entity, isIgnored }) => entity?.category === 'harvester' && !isIgnored).length;
  if (context.values.maxFluxNodes.value === null && harvesterCount > 0) {
    diagnostics.push(fluxNodesUnknown(harvesterCount));
  }
  return diagnostics;
};
