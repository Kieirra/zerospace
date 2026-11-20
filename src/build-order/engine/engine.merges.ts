import { missingMergeInput, ownerLimit } from './engine.diagnostics.ts';
import { toNames } from './engine.placement.ts';
import { findFirstInLaneOrder, toLaneId } from './engine.state.ts';
import type { BuildCatalog, BuildEntity } from '../build-order.types.ts';
import type { ArmyUnit, SimulationState } from './engine.internal.types.ts';
import type { Diagnostic, SimulationContext } from './engine.types.ts';

// Xol merges and Replicate copies (US-009): no producer, their lane is the one of what they need.

// Supply a merge adds at its start: its own minus the supply of its inputs (0 with the data of build 26680201: the
// supply is kept).
export const toSupplyDelta = (entity: BuildEntity, catalog: BuildCatalog) =>
  (entity.mergedFrom ?? []).reduce((delta, { entityId, count }) => {
    const input = catalog.get(entityId);
    return delta - (input ? (input.supply / input.count) * count : 0);
  }, entity.supply);

// Lane of the input ready the latest; on a tie, the higher of their lanes (Kieirra 2026-11-20).
export const toMergeLaneId = (inputs: ArmyUnit[], toRank: (laneId: string) => number) =>
  inputs.reduce<ArmyUnit | undefined>(
    (last, unit) =>
      !last || unit.readyTick > last.readyTick || (unit.readyTick === last.readyTick && toRank(unit.laneId) < toRank(last.laneId)) ? unit : last,
    undefined,
  )?.laneId;

// A merge or a copy that never starts: the higher lane among the producers in the build of its tier 1 units, else the
// starting base.
export const toFallbackLaneId = (entity: Pick<BuildEntity, 'id'>, state: SimulationState, context: SimulationContext) => {
  const producerIds = new Set(toTierOneIds(entity.id, context.catalog).flatMap((id) => context.catalog.get(id)?.producedBy ?? []));
  const lane = findFirstInLaneOrder(state, state.instances, ({ ids }) => [...ids].some((id) => producerIds.has(id)));
  const fallback = lane ?? state.instances.find(({ isStarting }) => isStarting);
  return fallback ? toLaneId(fallback) : null;
};

// The tier 1 units no building of the build makes, in recipe order: a merge or a copy that needs them never starts.
export const toUnobtainableInputs = (entity: Pick<BuildEntity, 'id'>, available: ReadonlySet<string>, catalog: BuildCatalog) =>
  [...new Set(toTierOneIds(entity.id, catalog))].flatMap((id) => {
    const unit = catalog.get(id);
    return unit && !unit.producedBy.some((producerId) => available.has(producerId)) ? [unit] : [];
  });

export const findUnobtainableInput = (entity: Pick<BuildEntity, 'id'>, available: ReadonlySet<string>, catalog: BuildCatalog) =>
  toUnobtainableInputs(entity, available, catalog)[0];

// Static checks of a merge or a copy: an input the build cannot make (error), more units than the game lets one own
// (warning only: the tool never loses units). `owned`: the merges and copies of the same unit before this one.
export const toMergeDiagnostics = (entity: BuildEntity, available: ReadonlySet<string>, catalog: BuildCatalog, owned: number) => {
  if (entity.category !== 'merge' && entity.category !== 'replicate') return [];
  const diagnostics: Diagnostic[] = [];
  const unobtainable = findUnobtainableInput(entity, available, catalog);
  if (unobtainable) diagnostics.push(missingMergeInput(unobtainable.name, toNames(unobtainable.producedBy, catalog)));
  if (entity.ownerLimit !== undefined && owned >= entity.ownerLimit) diagnostics.push(ownerLimit(entity.name, entity.ownerLimit));
  return diagnostics;
};

// Tier 1 units at the origin of a unit, through the recipes of the merges.
const toTierOneIds = (entityId: string, catalog: BuildCatalog): string[] => {
  const unit = catalog.get(entityId);
  return unit?.mergedFrom ? unit.mergedFrom.flatMap((input) => toTierOneIds(input.entityId, catalog)) : [entityId];
};
