import { canProduceOn, toLaneProducers } from '../build-order.helpers.ts';
import { REPLICATE_UID } from '../build-order.types.ts';
import { MAX_STEPS } from '../link/link.constants.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { createStepUids, toAllSteps, toOnceRuleReason, withOptional } from './build-editor.helpers.ts';
import { clampAt, sortTimed, toLatestAt } from './build-editor.timed.ts';
import type { Build, BuildCatalog, BuildEntity, QueuedStep, TimedStep } from '../build-order.types.ts';

// Steps copied with Ctrl+C, kept in memory, never in the system clipboard.
export interface ClipboardSteps {
  timed: TimedStep[];
  queued: QueuedStep[];
}

// Where a paste lands: the time and the lane under the pointer, when it is over the lanes.
export interface PasteTarget {
  at: number | null;
  laneUid: string | null;
}

// The build with the copies, and their uids; 'full' when they would pass MAX_STEPS.
export type ClipboardResult = { status: 'full' } | { status: 'ok'; build: Build; addedUids: string[]; skippedCount: number };

// The copies the rules keep and their new uids.
interface CopyPlan {
  status: 'copy';
  kept: ReturnType<typeof toAllowedSteps>;
  uids: string[];
}

// Selected steps copied with Ctrl+C, in their build order.
export const toClipboardSteps = (build: Pick<Build, 'timed' | 'queued'>, uids: Iterable<string>) => {
  const selected = new Set(uids);
  const isSelected = ({ uid }: { uid: string }) => selected.has(uid);
  return { timed: build.timed.filter(isSelected), queued: build.queued.filter(isSelected) };
};

// Timed steps keep their gaps, the earliest one at the pointer time (else the latest click of the build). Units keep
// their time and their loop, and go on the hovered lane when it can make them all, else on their lane when it is still
// there, else Auto (Kieirra 2026-11-19). A merge stays without lane, a Replicate copy a copy (US-009).
export const toPastedSteps = (build: Build, clip: ClipboardSteps, target: PasteTarget, catalog: BuildCatalog): ClipboardResult => {
  const plan = toCopyPlan(build, clip, catalog);
  if (plan.status !== 'copy') return plan;
  const { kept, uids } = plan;
  const offset = (target.at ?? toLatestAt(build)) - Math.min(...kept.timed.map(({ at }) => at));
  const laneUids = new Set(toLaneProducers(build, catalog).map(({ uid }) => uid));
  const isPinnable = (step: QueuedStep) => step.producerUid !== REPLICATE_UID && catalog.get(step.entityId)?.category !== 'merge';
  const canGoOnHovered = (step: QueuedStep) => {
    const entity = catalog.get(step.entityId);
    return target.laneUid !== null && entity !== undefined && canProduceOn(entity, target.laneUid, build, catalog);
  };
  const pinnable = kept.queued.filter(isPinnable);
  const hovered = pinnable.length > 0 && pinnable.every(canGoOnHovered) ? (target.laneUid ?? undefined) : undefined;
  const timed = kept.timed.map((step, index) =>
    withOptional<TimedStep, 'producerUid'>(
      { uid: uids[index], entityId: step.entityId, at: clampAt(step.at + offset) },
      'producerUid',
      keepLane(step.producerUid, laneUids),
    ),
  );
  const queued = kept.queued.map((step, index) =>
    withOptional(
      withOptional(
        withOptional<QueuedStep, 'at'>({ uid: uids[kept.timed.length + index], entityId: step.entityId }, 'at', step.at),
        'repeat',
        step.repeat,
      ),
      'producerUid',
      isPinnable(step) ? (hovered ?? keepLane(step.producerUid, laneUids)) : keepLane(step.producerUid, laneUids),
    ),
  );
  return {
    status: 'ok',
    build: { ...build, timed: sortTimed([...build.timed, ...timed]), queued: [...build.queued, ...queued] },
    addedUids: uids,
    skippedCount: kept.skippedCount,
  };
};

// Copies in place: same time (a new lane for a building), a unit right after its original, same pin.
export const toDuplicatedSteps = (build: Build, uids: string[], catalog: BuildCatalog): ClipboardResult => {
  const plan = toCopyPlan(build, toClipboardSteps(build, uids), catalog);
  if (plan.status !== 'copy') return plan;
  const { kept, uids: newUids } = plan;
  const copyUid = new Map(kept.queued.map(({ uid }, index) => [uid, newUids[kept.timed.length + index]]));
  const timed = kept.timed.map((step, index) => ({ ...step, uid: newUids[index] }));
  const queued = build.queued.flatMap((step) => {
    const uid = copyUid.get(step.uid);
    return uid === undefined ? [step] : [step, { ...step, uid }];
  });
  return { status: 'ok', build: { ...build, timed: sortTimed([...build.timed, ...timed]), queued }, addedUids: newUids, skippedCount: kept.skippedCount };
};

// The copies the rules keep and their new uids, else the result: nothing to copy, or the build would be full.
const toCopyPlan = (build: Build, clip: ClipboardSteps, catalog: BuildCatalog): CopyPlan | ClipboardResult => {
  const kept = toAllowedSteps(build, clip, catalog);
  const count = kept.timed.length + kept.queued.length;
  if (count === 0) return { status: 'ok', build, addedUids: [], skippedCount: kept.skippedCount };
  if (toAllSteps(build).length + count > MAX_STEPS) return { status: 'full' };
  return { status: 'copy', kept, uids: createStepUids(build, count) };
};

// Rules a copy must keep, the ones of a step allowed once (`toOnceRuleReason`). Unknown entities are skipped too.
const toAllowedSteps = (build: Build, clip: ClipboardSteps, catalog: BuildCatalog) => {
  const rules = resolveRules(build.factionId);
  const taken = toAllSteps(build).flatMap(({ entityId }) => catalog.get(entityId) ?? []);
  const isAllowed = (entity: BuildEntity | undefined): entity is BuildEntity => {
    if (!entity || toOnceRuleReason(entity, taken, build, rules) !== null) return false;
    taken.push(entity);
    return true;
  };
  const timed = clip.timed.filter((step) => isAllowed(catalog.get(step.entityId)));
  const queued = clip.queued.filter((step) => isAllowed(catalog.get(step.entityId)));
  return { timed, queued, skippedCount: clip.timed.length + clip.queued.length - timed.length - queued.length };
};

const keepLane = (producerUid: string | undefined, laneUids: Set<string>) =>
  producerUid !== undefined && (laneUids.has(producerUid) || producerUid === REPLICATE_UID) ? producerUid : undefined;
