import { canProduceOn, formatClock, toStepKind } from '../../build-order.helpers.ts';
import { LANE_ID_PREFIX } from '../../engine/engine.constants.ts';
import { toLaneId } from '../../engine/engine.state.ts';
import { toTimelineSeconds } from '../../timeline/timeline.helpers.ts';
import { toAllSteps } from '../build-editor.helpers.ts';
import { clampAt } from '../build-editor.timed.ts';
import type { Build, BuildCatalog } from '../../build-order.types.ts';
import type { SimulationResult } from '../../engine/engine.types.ts';
import type { DragSource, DropTarget } from '../../timeline/timeline-editing.ts';
import type { EditorAction } from '../build-editor.reducer.ts';

// A drop the target lane cannot take: no preview, the not-allowed cursor.
export const REFUSED_DROP = 'refused';

// What a drop does (Kieirra 2026-11-19): a mark moves by whole seconds, with the selection if in it, each from its origin
// (toDragOrigin); units only, over another lane, are pinned there and shifted alike; a card lands at the pointer's time,
// a unit card on the lane under it if it can make it; a click handle moves its step alone. null: nothing, or a card refused.
export const toDropAction = (
  build: Build,
  result: SimulationResult,
  catalog: BuildCatalog,
  source: DragSource,
  target: DropTarget,
  selectedUids: ReadonlySet<string>,
): EditorAction | typeof REFUSED_DROP | null => {
  if (source.kind === 'click') return toClickAction(build, result, source.uid, target.delta);
  if (source.kind === 'step') {
    const uids = selectedUids.has(source.uid) ? [...selectedUids] : [source.uid];
    if (isLaneChange(build, uids, source.laneId, target.laneId)) return toLaneMoveAction(build, result, catalog, uids, target);
    return target.delta === 0 ? null : toShiftAction(build, result, uids, source.uid, target.delta);
  }
  const entity = catalog.get(source.entityId);
  if (!entity) return null;
  const at = clampAt(target.t);
  if (toStepKind(entity) === 'timed') return { type: 'add-timed', entityId: entity.id, at };
  const laneUid = toLaneUid(target.laneId);
  return laneUid !== null && canProduceOn(entity, laneUid, build, catalog)
    ? { type: 'add-queued', entityId: entity.id, producerUid: laneUid, at }
    : null;
};

// Units pinned on the lane under the pointer if it can make them all, else refused (Kieirra 2026-11-19). Moved straight
// up or down, they go before its first unit starting after the drop time; moved in time, each shifts from its origin so
// the grabbed one lands under the pointer, and the queue is sorted by time, units without one first.
export const toLaneMoveAction = (
  build: Build,
  result: SimulationResult,
  catalog: BuildCatalog,
  uids: string[],
  target: DropTarget,
): EditorAction | typeof REFUSED_DROP => {
  const laneUid = toLaneUid(target.laneId);
  const canMakeAll =
    laneUid !== null &&
    uids.every((uid) => {
      const entity = catalog.get(build.queued.find((step) => step.uid === uid)?.entityId ?? '');
      return entity !== undefined && canProduceOn(entity, laneUid, build, catalog);
    });
  if (!canMakeAll) return REFUSED_DROP;
  const moving = new Set(uids);
  const before = build.queued.find(({ uid }) => {
    const timing = toTiming(result, uid);
    return !moving.has(uid) && timing?.laneId === target.laneId && timing.startAt !== null && timing.startAt > target.t;
  });
  const move = { type: 'move-to-lane' as const, uids, laneUid, beforeUid: before?.uid ?? null };
  return target.delta ? { ...move, shift: { origins: toOrigins(build, result, uids), delta: target.delta } } : move;
};

// 'Click 2:35 · starts ≈ 2:41', 'Barracks #2 · Click 3:00 · starts ≈ 3:04', 'Barracks #2 · starts ≈ 2:41', '… · never starts'.
export const toDropLabel = (action: EditorAction, stepUid: string, build: Build, result: SimulationResult) => {
  const start = toStartAt(result, stepUid);
  const starts = start === null ? 'never starts' : `starts ≈ ${formatClock(start)}`;
  const at = toStepAt(build, stepUid);
  const time = `${at === undefined ? '' : `Click ${formatClock(at)} · `}${starts}`;
  // The lane the units go to, even when they would never start there.
  if (action.type === 'add-queued' || action.type === 'move-to-lane') {
    const laneUid = action.type === 'add-queued' ? action.producerUid : action.laneUid;
    const lane = laneUid === undefined ? undefined : result.lanes.find(({ id }) => id === toLaneId({ uid: laneUid }));
    return `${lane?.label ?? 'Auto'} · ${time}`;
  }
  return time;
};

// Unit a palette card adds, for its ghost (Kieirra 2026-11-19): where it starts, else its click time, its seconds and
// its name. undefined: no unit, or no time to stand at.
export const toAddedMark = (build: Build, result: SimulationResult, catalog: BuildCatalog, stepUid: string) => {
  const step = build.queued.find(({ uid }) => uid === stepUid);
  const entity = step && catalog.get(step.entityId);
  const startAt = toDragOrigin(build, result, stepUid);
  if (!entity || startAt === null) return undefined;
  const timing = toTiming(result, stepUid);
  const seconds = timing && timing.startAt !== null && timing.endAt !== null ? timing.endAt - timing.startAt : (entity.duration ?? 0);
  return { startAt, seconds, label: entity.displayName };
};

// Time a drag of the step moves from (Kieirra 2026-11-19): the left edge of its mark, its simulated start, else its
// click time when it never starts. null: unknown step, or a unit that never starts and has no time.
export const toDragOrigin = (build: Build, result: SimulationResult, uid: string) => {
  const step = toAllSteps(build).find((candidate) => candidate.uid === uid);
  return step ? (toStartAt(result, uid) ?? step.at ?? null) : null;
};

// Where the line of a drag released in place stands: the step's click time for its click handle, else its origin.
export const toSamePlaceAt = (build: Build, result: SimulationResult, source: Exclude<DragSource, { kind: 'entity' }>) =>
  source.kind === 'click' ? (toStepAt(build, source.uid) ?? null) : toDragOrigin(build, result, source.uid);

// Click time of a step, undefined for a unit without one.
export const toStepAt = (build: Build, stepUid: string) => toAllSteps(build).find(({ uid }) => uid === stepUid)?.at;

// 'lane:b3' → 'b3'; the setup hero lane is no building.
export const toLaneUid = (laneId: string | null) => (laneId?.startsWith(LANE_ID_PREFIX) ? laneId.slice(LANE_ID_PREFIX.length) : null);

export const toSamePlace = (at: number | null) => ({ label: 'Stays here', isSamePlace: true, at, laneId: null });

// Click handle (Kieirra 2026-11-19): the step's own time `at` plus the whole seconds moved, held between 0 and the end of
// the timeline; where it starts is left to the simulation. null: no time, or the same one.
const toClickAction = (build: Build, result: SimulationResult, uid: string, delta: number): EditorAction | null => {
  const from = toStepAt(build, uid);
  if (from === undefined) return null;
  const at = Math.min(clampAt(from + delta), toTimelineSeconds(result.endTime));
  if (at === from) return null;
  return build.timed.some((step) => step.uid === uid) ? { type: 'set-at', uid, at } : { type: 'set-queued-at', uids: [uid], at };
};

// Units only, released over another lane than the grabbed one's: a mixed selection only moves in time.
const isLaneChange = (build: Build, uids: string[], from: string | null, to: string | null) =>
  to !== null && to !== from && uids.every((uid) => build.queued.some((step) => step.uid === uid));

// The same whole seconds for every step, each from its origin; a step without one stays.
const toShiftAction = (build: Build, result: SimulationResult, uids: string[], grabbedUid: string, delta: number): EditorAction | null => {
  const origins = toOrigins(build, result, uids);
  return grabbedUid in origins ? { type: 'shift-at', origins, delta } : null;
};

// Origin of each step by uid (toDragOrigin); a step without one is left out.
const toOrigins = (build: Build, result: SimulationResult, uids: string[]): Record<string, number> =>
  Object.fromEntries(
    uids.flatMap((uid) => {
      const origin = toDragOrigin(build, result, uid);
      return origin === null ? [] : [[uid, origin]];
    }),
  );

const toStartAt = (result: SimulationResult, uid: string) => toTiming(result, uid)?.startAt ?? null;

const toTiming = (result: SimulationResult, uid: string) => result.steps.find(({ stepUid }) => stepUid === uid);
