import { HORIZON_SECONDS } from '../engine/engine.constants.ts';
import { toUidNumber, withOptional } from './build-editor.helpers.ts';
import type { Build, TimedStep } from '../build-order.types.ts';

// Pure changes of `timed` (Kieirra 2026-11-19): only `at` carries a meaning, the order of the array is canonical.

// Whole seconds from 0 to the end of the simulation.
export const clampAt = (at: number) => Math.min(Math.max(Math.round(at), 0), HORIZON_SECONDS);

// Canonical order for the link and the tests: (at, uid number).
export const sortTimed = (timed: TimedStep[]) => [...timed].sort((a, b) => a.at - b.at || toUidNumber(a.uid) - toUidNumber(b.uid));

// Where a step added by a click goes: with the latest click of the build, so it starts as soon as possible after it.
export const toLatestAt = (build: Pick<Build, 'timed'>) => Math.max(0, ...build.timed.map(({ at }) => at));

export const addTimed = (build: Build, step: TimedStep) => ({
  ...build,
  timed: sortTimed([...build.timed, { ...step, at: clampAt(step.at) }]),
});

export const setTimedAt = (build: Build, uid: string, at: number) => updateTimedAt(build, [uid], () => clampAt(at));

// A transformation pinned on a building, or back to Auto (undefined).
export const setTimedProducer = (build: Build, uid: string, producerUid?: string) => {
  const index = build.timed.findIndex((step) => step.uid === uid);
  if (index === -1) return build;
  const step = withOptional(build.timed[index], 'producerUid', producerUid);
  return step === build.timed[index] ? build : { ...build, timed: build.timed.with(index, step) };
};

// Every moved step goes to its origin (by uid) plus the same whole seconds, each one held between 0 and the end.
export const shiftTimedAt = (build: Build, origins: Record<string, number>, delta: number) =>
  updateTimedAt(build, Object.keys(origins), ({ uid }) => clampAt(origins[uid] + Math.round(delta)));

const updateTimedAt = (build: Build, uids: string[], toAt: (step: TimedStep) => number) => {
  const selected = new Set(uids);
  let isChanged = false;
  const timed = build.timed.map((step) => {
    if (!selected.has(step.uid)) return step;
    const at = toAt(step);
    if (at === step.at) return step;
    isChanged = true;
    return { ...step, at };
  });
  return isChanged ? { ...build, timed: sortTimed(timed) } : build;
};
