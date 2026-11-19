import { toCapableProducerUids, toLaneProducers, toStepKind } from '../build-order.helpers.ts';
import { withOptional } from './build-editor.helpers.ts';
import { clampAt } from './build-editor.timed.ts';
import type { Build, BuildCatalog, QueuedStep } from '../build-order.types.ts';

// Pure changes of `queued` (Kieirra 2026-11-19): its order is the production order.

export const addQueued = (build: Build, step: QueuedStep) => ({ ...build, queued: [...build.queued, step] });

// undefined: back to Auto.
export const setQueuedProducer = (build: Build, uid: string, producerUid?: string) =>
  updateQueued(build, uid, (step) => withOptional(step, 'producerUid', producerUid));

// Any unit may have a time `at`: not released before it (Kieirra 2026-11-19). null: as soon as possible.
export const setQueuedAt = (build: Build, uids: string[], at: number | null) =>
  updateQueuedAt(build, uids, () => (at === null ? undefined : clampAt(at)));

// Every moved unit goes to its origin (by uid) plus the same whole seconds, each time held between 0 and the end.
export const shiftQueuedAt = (build: Build, origins: Record<string, number>, delta: number) =>
  updateQueuedAt(build, Object.keys(origins), ({ uid }) => clampAt(origins[uid] + Math.round(delta)));

// Pinned on the lane, in their order, before `beforeUid`; without it, after the last unit already on that lane, or in
// place when there is none.
export const moveToLane = (build: Build, uids: string[], laneUid: string, beforeUid: string | null) => {
  const moving = new Set(uids);
  const moved = build.queued.filter(({ uid }) => moving.has(uid)).map((step) => ({ ...step, producerUid: laneUid }));
  if (moved.length === 0) return build;
  const others = build.queued.filter(({ uid }) => !moving.has(uid));
  const before = beforeUid === null ? -1 : others.findIndex(({ uid }) => uid === beforeUid);
  const lastOnLane = others.findLastIndex(({ producerUid }) => producerUid === laneUid);
  const firstMoved = build.queued.findIndex(({ uid }) => moving.has(uid));
  const inPlace = build.queued.slice(0, firstMoved).filter(({ uid }) => !moving.has(uid)).length;
  const index = before !== -1 ? before : lastOnLane !== -1 ? lastOnLane + 1 : inPlace;
  return { ...build, queued: others.toSpliced(index, 0, ...moved) };
};

// Invariant (Kieirra 2026-11-19): no unit without a building able to make it. A unit pinned on a lane gone goes back
// to Auto first; then every unit no lane of the build can make leaves. Unknown entities are kept.
export const dropOrphanUnits = (build: Build, catalog: BuildCatalog) => {
  const laneUids = new Set(toLaneProducers(build, catalog).map(({ uid }) => uid));
  const unpinned = build.queued.map((step) =>
    step.producerUid === undefined || laneUids.has(step.producerUid) ? step : withOptional(step, 'producerUid', undefined),
  );
  const queued = unpinned.filter((step) => {
    const entity = catalog.get(step.entityId);
    return !entity || toStepKind(entity) !== 'queued' || toCapableProducerUids(entity, build, catalog).length > 0;
  });
  const isSame = queued.length === build.queued.length && queued.every((step, index) => step === build.queued[index]);
  return { build: isSame ? build : { ...build, queued }, droppedCount: build.queued.length - queued.length };
};

// A setup hero picked from the header takes it out of the Altar: a hero is picked once, the setup one first.
export const dropPickedHero = (build: Build, heroId: string | null) => {
  const queued = build.queued.filter(({ entityId }) => entityId !== heroId);
  return queued.length === build.queued.length ? build : { ...build, queued };
};

const updateQueued = (build: Build, uid: string, update: (step: QueuedStep) => QueuedStep) => {
  const index = build.queued.findIndex((step) => step.uid === uid);
  if (index === -1) return build;
  const step = update(build.queued[index]);
  return step === build.queued[index] ? build : { ...build, queued: build.queued.with(index, step) };
};

// The order of a lane follows the times (Kieirra 2026-11-19): stable sort, the units without a time first.
const updateQueuedAt = (build: Build, uids: string[], toAt: (step: QueuedStep) => number | undefined) => {
  const selected = new Set(uids);
  let isChanged = false;
  const queued = build.queued.map((step) => {
    if (!selected.has(step.uid)) return step;
    const next = withOptional(step, 'at', toAt(step));
    isChanged ||= next !== step;
    return next;
  });
  return isChanged ? { ...build, queued: queued.toSorted((a, b) => toSortAt(a) - toSortAt(b)) } : build;
};

// Before any time: a time is never below 0.
const toSortAt = ({ at }: QueuedStep) => at ?? -1;
