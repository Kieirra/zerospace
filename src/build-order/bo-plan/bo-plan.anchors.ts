import type { BoAnchor } from './bo-plan.types.ts';
import type { SimulationResult } from '../engine/engine.types.ts';

// What `->` waits for: the end of the direct steps of the previous group, or the start of every copy of the item that
// carries a trigger. `at` is the time of that group, the fallback when none of its steps has the time.
export interface PreviousGroup {
  at: number;
  uids: string[];
  event: 'starts' | 'done';
}

export interface AnchorLookup {
  // Simulation of every step placed so far.
  getResult: () => SimulationResult;
  // Same, with the resources sampled up to the horizon.
  getSampledResult: () => SimulationResult;
  // Step uid of the first occurrence of each entity, in the order of the build order.
  firstUids: Map<string, string>;
  setupHeroId: string | null;
}

export const FIRST_PREVIOUS: PreviousGroup = { at: 0, uids: [], event: 'done' };

// Whole seconds; an anchor that cannot be found falls back on `->`.
export const resolveAnchor = (anchor: BoAnchor, previous: PreviousGroup, lookup: AnchorLookup) => {
  if (anchor.kind === 'time') return anchor.seconds;
  if (anchor.kind === 'entity') return findEntityTime(anchor, lookup) ?? afterPrevious(previous, lookup);
  if (anchor.kind === 'resources') return findResourcesTime(anchor, previous, lookup) ?? afterPrevious(previous, lookup);
  return afterPrevious(previous, lookup);
};

// The simulation gives tenths of a second: the tolerance keeps 12.000000001 at 12.
export const toWholeSeconds = (seconds: number) => Math.ceil(seconds - CEIL_TOLERANCE);

// A step clicked on the very tick a step starts may take its place: with startPriority, a supply or a unit goes first.
// Waiting for a start lands one whole second after it, so the awaited step is always started.
export const toAfterStart = (seconds: number) => Math.floor(seconds + CEIL_TOLERANCE) + 1;

const CEIL_TOLERANCE = 1e-9;

const toAnchorSeconds = (seconds: number, event: PreviousGroup['event']) =>
  event === 'starts' ? toAfterStart(seconds) : toWholeSeconds(seconds);

const afterPrevious = ({ at, uids, event }: PreviousGroup, { getResult }: AnchorLookup) => {
  if (uids.length === 0) return at;
  const times = uids.flatMap((uid) => {
    const time = findStepTime(getResult(), uid, event);
    return time === null ? [] : [time];
  });
  return times.length === 0 ? at : toAnchorSeconds(Math.max(...times), event);
};

// The setup hero is never a step: it joins at its setup time.
const findEntityTime = (anchor: Extract<BoAnchor, { kind: 'entity' }>, lookup: AnchorLookup) => {
  const setup = anchor.entityId === lookup.setupHeroId ? lookup.getResult().heroes.setup : null;
  if (setup) return toWholeSeconds(setup.at);
  const uid = lookup.firstUids.get(anchor.entityId);
  const time = uid === undefined ? null : findStepTime(lookup.getResult(), uid, anchor.event);
  return time === null ? undefined : toAnchorSeconds(time, anchor.event);
};

// First whole second, from the start of the previous group, with every given amount in the bank.
const findResourcesTime = (
  { hexite, flux }: Extract<BoAnchor, { kind: 'resources' }>,
  previous: PreviousGroup,
  lookup: AnchorLookup,
) =>
  lookup
    .getSampledResult()
    .samples.find(
      (sample) =>
        sample.t >= previous.at &&
        (hexite === undefined || sample.hexite >= hexite) &&
        (flux === undefined || sample.flux >= flux),
    )?.t;

const findStepTime = (result: SimulationResult, uid: string, event: PreviousGroup['event']) => {
  const step = result.steps.find(({ stepUid }) => stepUid === uid);
  if (!step) return null;
  return event === 'starts' ? step.startAt : step.endAt;
};
