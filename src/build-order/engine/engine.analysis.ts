import { isBuildingCategory, toLaneOrder } from '../build-order.helpers.ts';
import {
  duplicateMercenaryBuilding,
  duplicateResearch,
  exclusiveResearch,
  harvesterCap,
  missingRequirement,
  unknownDuration,
  unknownEntity,
} from './engine.diagnostics.ts';
import { getMaxHarvesters, toTicks } from './engine.economy.ts';
import { checkHeroStep } from './engine.heroes.ts';
import { resolvePlacement, toBuildScope, toNames } from './engine.placement.ts';
import type { StepKind } from '../build-order.helpers.ts';
import type { Build, BuildEntity, QueuedStep, TimedStep } from '../build-order.types.ts';
import type { RequiresMode, StartRank } from '../rules/rules.data.ts';
import type { HeroSlots, PlannedStep } from './engine.internal.types.ts';
import type { BuildScope } from './engine.placement.ts';
import type { Diagnostic, SimulationContext } from './engine.types.ts';

// Static pass over time (Kieirra 2026-11-19): "before" means a smaller `at`, the queued steps keep their order.
// A requirement absent from the build is an error; a requirement present but late is a wait at run time.
export const analyzeBuild = (build: Build, context: SimulationContext, heroSlots: HeroSlots): PlannedStep[] => {
  const scope = toBuildScope(build, context.catalog);
  const tracker = createTracker();
  const timed = new Array<PlannedStep>(build.timed.length);
  for (const step of toLaneOrder(build.timed)) {
    const index = build.timed.indexOf(step);
    timed[index] = analyzeStep(step, 'timed', index, index, { context, scope, tracker, heroSlots });
  }
  const queued = build.queued.map((step, tie) =>
    analyzeStep(step, 'queued', build.timed.length + tie, tie, { context, scope, tracker, heroSlots }),
  );
  return [...timed, ...queued];
};

export const isRequirementMet = (requires: string[], mode: RequiresMode, hasId: (id: string) => boolean) =>
  mode === 'any' ? requires.length === 0 || requires.some(hasId) : requires.every(hasId);

// Requirements still missing, joined by 'or' when one is enough; null when they are met.
export const toMissingRequires = (requires: string[], mode: RequiresMode, has: (id: string) => boolean) =>
  isRequirementMet(requires, mode, has)
    ? null
    : { ids: mode === 'any' ? requires : requires.filter((id) => !has(id)), conjunction: toRequiresConjunction(mode) };

export const toRequiresConjunction = (mode: RequiresMode): 'or' | 'and' => (mode === 'any' ? 'or' : 'and');

// Class of the start priority (`rules.startPriority`), read from the data.
const toStartRank = (entity: BuildEntity): StartRank => {
  if (entity.category === 'mercenary-unit') return 'mercenary-unit';
  if (entity.kind === 'building' && entity.economy?.kind === 'hexite-base') return 'base';
  if (entity.kind === 'building' && entity.supplyProvided !== undefined) return 'supply';
  if (entity.category === 'unit' || entity.category === 'harvester' || entity.category === 'hero') return 'unit';
  return 'other';
};

interface Tracker {
  // Seconds of the first one, by research id and by exclusive group.
  researchAt: Map<string, number>;
  groupAt: Map<string, { name: string; at: number }>;
  mercenaryAt: Map<string, number[]>;
  harvesterCounts: Map<string, number>;
  // Paid heroes, entity id → uid of the step.
  heroUids: Map<string, string>;
}

interface AnalysisInput {
  context: SimulationContext;
  scope: BuildScope;
  tracker: Tracker;
  heroSlots: HeroSlots;
}

const createTracker = (): Tracker => ({
  researchAt: new Map(),
  groupAt: new Map(),
  mercenaryAt: new Map(),
  harvesterCounts: new Map(),
  heroUids: new Map(),
});

const analyzeStep = (
  step: TimedStep | QueuedStep,
  kind: StepKind,
  index: number,
  tie: number,
  { context, scope, tracker, heroSlots }: AnalysisInput,
): PlannedStep => {
  const base = { index, uid: step.uid, kind, tie, atTick: step.at === undefined ? undefined : toTicks(step.at) };
  const entity = context.catalog.get(step.entityId);
  if (!entity) return toIgnored(base, unknownEntity());
  const conflict = findResearchConflict(entity, tracker) ?? findMercenaryConflict(entity, context, tracker);
  if (conflict) return toIgnored(base, conflict, entity);
  const hero = entity.category === 'hero' ? checkHeroStep(entity, heroSlots, tracker.heroUids) : undefined;
  if (hero?.isIgnored && hero.diagnostic) return { ...toIgnored(base, hero.diagnostic, entity), firstUid: hero.firstUid };
  const diagnostics: Diagnostic[] = hero?.diagnostic ? [hero.diagnostic] : [];
  if (!isHarvesterAllowed(entity, context, tracker)) return toIgnored(base, toHarvesterCap(entity, context), entity);
  const requires = resolveRequires(entity, context, scope, diagnostics);
  const placement = resolvePlacement(entity, step.producerUid, context, scope, diagnostics);
  if (entity.duration === null) diagnostics.push(unknownDuration());
  recordStep(entity, step, tracker);
  return {
    ...base,
    entity,
    isIgnored: false,
    producerUid: placement.producerUid,
    rank: toStartRank(entity),
    requires,
    producerIds: placement.producerIds,
    thread: placement.thread,
    createsInstance: isBuildingCategory(entity),
    diagnostics,
  };
};

const toIgnored = (
  base: Pick<PlannedStep, 'index' | 'uid' | 'kind' | 'tie' | 'atTick'>,
  diagnostic: Diagnostic,
  entity?: BuildEntity,
): PlannedStep => ({
  ...base,
  entity,
  isIgnored: true,
  rank: entity ? toStartRank(entity) : 'other',
  requires: [],
  producerIds: [],
  createsInstance: false,
  diagnostics: [diagnostic],
});

const findResearchConflict = (entity: BuildEntity, tracker: Tracker) => {
  if (entity.category !== 'research') return undefined;
  const firstAt = tracker.researchAt.get(entity.id);
  if (firstAt !== undefined) return duplicateResearch(firstAt);
  const group = entity.exclusiveGroup ? tracker.groupAt.get(entity.exclusiveGroup) : undefined;
  return group ? exclusiveResearch(group.name, group.at) : undefined;
};

const findMercenaryConflict = (entity: BuildEntity, context: SimulationContext, tracker: Tracker) => {
  if (entity.category !== 'mercenary-building') return undefined;
  const times = tracker.mercenaryAt.get(entity.id) ?? [];
  const copies = context.rules.mercenaryBuildingCopies.value;
  return times.length < copies ? undefined : duplicateMercenaryBuilding(entity.displayName, copies, times[0]);
};

// A requirement absent from the build is reported and dropped: the step is still placed.
const resolveRequires = (entity: BuildEntity, context: SimulationContext, scope: BuildScope, diagnostics: Diagnostic[]) => {
  const mode = context.rules.requiresMode[entity.kind].value;
  const isInBuild = (id: string) => scope.available.has(id);
  const missing = toMissingRequires(entity.requires, mode, isInBuild);
  if (missing) diagnostics.push(missingRequirement(toNames(missing.ids, context.catalog), missing.conjunction));
  return entity.requires.filter(isInBuild);
};

const isHarvesterAllowed = (entity: BuildEntity, context: SimulationContext, tracker: Tracker) => {
  const limit = entity.category === 'harvester' ? getMaxHarvesters(entity, context.values) : undefined;
  return !limit || (tracker.harvesterCounts.get(entity.id) ?? 0) < limit.max;
};

const toHarvesterCap = (entity: BuildEntity, context: SimulationContext) => {
  const limit = getMaxHarvesters(entity, context.values);
  return harvesterCap(limit?.max ?? 0, limit?.nodes ?? 0, limit?.perNode ?? 0);
};

const recordStep = (entity: BuildEntity, step: TimedStep | QueuedStep, tracker: Tracker) => {
  const at = step.at ?? 0;
  if (entity.category === 'hero') tracker.heroUids.set(entity.id, step.uid);
  if (entity.category === 'mercenary-building') tracker.mercenaryAt.set(entity.id, [...(tracker.mercenaryAt.get(entity.id) ?? []), at]);
  if (entity.category === 'harvester') tracker.harvesterCounts.set(entity.id, (tracker.harvesterCounts.get(entity.id) ?? 0) + 1);
  if (entity.category === 'research') {
    tracker.researchAt.set(entity.id, at);
    if (entity.exclusiveGroup) tracker.groupAt.set(entity.exclusiveGroup, { name: entity.name, at });
  }
};
