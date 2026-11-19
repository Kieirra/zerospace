import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { toStepKind } from '../build-order.helpers.ts';
import { sortTimed } from '../build-editor/build-editor.timed.ts';
import { getDefaultHeroId, getHeroPool } from '../catalog/catalog.helpers.ts';
import { HORIZON_SECONDS } from '../engine/engine.constants.ts';
import { createSimulationContext, simulateBuild } from '../engine/engine.ts';
import { MAX_STEPS } from '../link/link.constants.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { FIRST_PREVIOUS, resolveAnchor } from './bo-plan.anchors.ts';
import type { Build, SideCatalog } from '../build-order.types.ts';
import type { SimulationContext, SimulationResult } from '../engine/engine.types.ts';
import type { AnchorLookup, PreviousGroup } from './bo-plan.anchors.ts';
import type { BoGroup, BoItem, BoPlan } from './bo-plan.types.ts';

export interface BoCatalogs {
  faction: SideCatalog;
  mercenary: SideCatalog | null;
}

// Group by group, in the order of the build order: each `at` is read from the simulation of the steps placed before it.
// Entities absent from the catalogs and the setup hero are left out; past MAX_STEPS, the steps are cut.
export const toBuild = (plan: BoPlan, catalogs: BoCatalogs): Build => {
  const state = createImportState(plan, catalogs);
  plan.phases
    .flatMap(({ groups }) => groups)
    .reduce((previous, group) => placeGroup(state, group, previous), FIRST_PREVIOUS);
  return toCurrentBuild(state);
};

interface ImportState {
  build: Build;
  context: SimulationContext;
  lookup: AnchorLookup;
  stepCount: number;
  // Cleared by every new step.
  result?: SimulationResult;
}

const createImportState = (plan: BoPlan, catalogs: BoCatalogs) => {
  const build: Build = {
    version: 3,
    dataVersion: STEAM_BUILD_ID,
    factionId: plan.factionId,
    mercenaryId: plan.mercenaryId,
    heroId: resolveHeroId(plan, catalogs),
    title: plan.title,
    author: plan.author,
    timed: [],
    queued: [],
  };
  const context = createSimulationContext(build, catalogs.faction, catalogs.mercenary);
  const state: ImportState = {
    build,
    context,
    stepCount: 0,
    lookup: {
      getResult: () => (state.result ??= simulateBuild(toCurrentBuild(state), context)),
      getSampledResult: () => simulateBuild(toCurrentBuild(state), context, { minSampledSeconds: HORIZON_SECONDS }),
      firstUids: new Map(),
      setupHeroId: build.heroId,
    },
  };
  return state;
};

// A group left empty by the losses is skipped: the next `->` waits for the group before it.
const placeGroup = (state: ImportState, group: BoGroup, previous: PreviousGroup): PreviousGroup => {
  const at = resolveAnchor(group.anchor, previous, state.lookup);
  const placed = group.items.map((item) => ({ item, uids: addCopies(state, item, at) }));
  for (const { item, uids } of placed) {
    (item.trigger ?? []).reduce<PreviousGroup>(
      (triggerPrevious, triggerGroup) => placeGroup(state, triggerGroup, triggerPrevious),
      { at, uids, event: 'starts' },
    );
  }
  const uids = placed.flatMap(({ uids }) => uids);
  return uids.length === 0 ? previous : { at, uids, event: 'done' };
};

const addCopies = (state: ImportState, { entityId, count }: BoItem, at: number) => {
  const entity = state.context.catalog.get(entityId);
  if (!entity || entityId === state.build.heroId) return [];
  const uids: string[] = [];
  for (let copy = 0; copy < count && state.stepCount < MAX_STEPS; copy += 1) {
    state.stepCount += 1;
    const uid = `s${state.stepCount}`;
    const steps = toStepKind(entity) === 'timed' ? state.build.timed : state.build.queued;
    steps.push({ uid, entityId, at });
    if (!state.lookup.firstUids.has(entityId)) state.lookup.firstUids.set(entityId, uid);
    uids.push(uid);
  }
  if (uids.length > 0) state.result = undefined;
  return uids;
};

const toCurrentBuild = ({ build }: ImportState): Build => ({
  ...build,
  timed: sortTimed(build.timed),
  queued: [...build.queued],
});

// The setup hero of the guide when the pool has it, else the default one of the tool.
const resolveHeroId = (plan: BoPlan, { faction, mercenary }: BoCatalogs) => {
  const pool = getHeroPool(faction.side, mercenary?.side ?? null, resolveRules(plan.factionId));
  return pool.some(({ heroId }) => heroId === plan.heroId) ? plan.heroId : getDefaultHeroId(pool);
};
