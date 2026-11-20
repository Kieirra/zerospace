import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { toStepKind } from '../build-order.helpers.ts';
import { REPLICATE_UID } from '../build-order.types.ts';
import { sortTimed } from '../build-editor/build-editor.timed.ts';
import { getDefaultHeroId, getHeroPool } from '../catalog/catalog.helpers.ts';
import { HORIZON_SECONDS } from '../engine/engine.constants.ts';
import { createSimulationContext, simulateBuild } from '../engine/engine.ts';
import { MAX_STEPS } from '../link/link.constants.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { FIRST_PREVIOUS, resolveAnchor } from './bo-plan.anchors.ts';
import type { Build, QueuedStep, SideCatalog, TimedStep } from '../build-order.types.ts';
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

const AFTER_PREVIOUS = { kind: 'after-previous' } as const;

// A group left empty by the losses is skipped: the next `->` waits for the group before it. The loops of a group are
// never awaited, by `->` (D1) or by a trigger. `A + B + C` keeps its order (Kieirra 2026-11-19): each item placed waits
// for the start of every copy of the one placed before it, like a trigger, else one second after its time; its copies
// and loops share its time, a lost item is skipped. The trigger of an item is placed right after it, before the next
// item: the next item reads the start of this one with the trigger already there, as `Copy as BO` writes it back.
const placeGroup = (state: ImportState, group: BoGroup, previous: PreviousGroup): PreviousGroup => {
  const at = resolveAnchor(group.anchor, previous, state.lookup);
  let before: PreviousGroup | null = null;
  const placed = group.items.map((item) => {
    const itemAt = before === null ? at : resolveAnchor(AFTER_PREVIOUS, before, state.lookup);
    const uids = addCopies(state, item, itemAt);
    addLoops(state, item, uids, itemAt);
    (item.trigger ?? []).reduce<PreviousGroup>(
      (triggerPrevious, triggerGroup) => placeGroup(state, triggerGroup, triggerPrevious),
      { at, uids, event: 'starts' },
    );
    if (uids.length > 0) before = { at: itemAt + 1, uids, event: 'starts' };
    return uids;
  });
  const uids = placed.flat();
  return uids.length === 0 ? previous : { at, uids, event: 'done' };
};

// `Replicate (on X)` (US-009): one copy step of X per count, made by the top bar.
const addCopies = (state: ImportState, { entityId, count, on }: BoItem, at: number) => {
  const entity = state.context.catalog.get(on ?? entityId);
  if (!entity || entityId === state.build.heroId || (on !== undefined && entity.replicateEnergy === undefined)) return [];
  const uids: string[] = [];
  for (let copy = 0; copy < count && state.stepCount < MAX_STEPS; copy += 1) {
    const steps = toStepKind(entity) === 'timed' ? state.build.timed : state.build.queued;
    uids.push(addStep(state, steps, { entityId: entity.id, at, ...(on !== undefined && { producerUid: REPLICATE_UID }) }));
  }
  return uids;
};

// `(loop X)`: one X per copy of the item, pinned on it, made in a loop when X is a unit (D6), else once.
const addLoops = (state: ImportState, { loop }: BoItem, producerUids: string[], at: number) => {
  const entity = loop === undefined ? undefined : state.context.catalog.get(loop);
  if (!entity || toStepKind(entity) !== 'queued' || entity.id === state.build.heroId) return;
  for (const producerUid of producerUids) {
    if (state.stepCount >= MAX_STEPS) return;
    const repeat = entity.category === 'unit' && { repeat: true as const };
    addStep(state, state.build.queued, { entityId: entity.id, producerUid, at, ...repeat });
  }
};

// Uids `s1`, `s2`… in the order of the build order.
const addStep = (state: ImportState, steps: (TimedStep | QueuedStep)[], step: Omit<TimedStep, 'uid'> | Omit<QueuedStep, 'uid'>) => {
  state.stepCount += 1;
  const uid = `s${state.stepCount}`;
  steps.push({ uid, ...step });
  if (!state.lookup.firstUids.has(step.entityId)) state.lookup.firstUids.set(step.entityId, uid);
  state.result = undefined;
  return uid;
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
