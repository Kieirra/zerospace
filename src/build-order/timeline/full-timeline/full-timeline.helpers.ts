import { formatClock, formatSupply } from '../../build-order.helpers.ts';
import { WAIT_LABEL_MIN_SECONDS } from '../timeline.constants.ts';
import type { Lane, ResourceSample, SimulationResult, StackGauge } from '../../engine/engine.types.ts';
import type { CurvePoint, DisplayLane, FullLane, LaneNote, LegendKind, ResourceTracks, TimelineItem } from '../timeline.types.ts';

// Smallest top of the Hexite and Flux scales: a low bank stays a low curve.
const MIN_BANK_SCALE = 100;
const MIN_SUPPLY_SCALE = 10;

// The lanes of toProducerLanes, each with what is drawn on top of it: ready mark, idle time, right label.
export const toFullLanes = (lanes: DisplayLane[], engineLanes: Lane[]): FullLane[] => {
  const engineLaneById = new Map(engineLanes.map((lane) => [lane.id, lane]));
  return lanes.map((lane) => {
    const engineLane = engineLaneById.get(lane.id);
    if (!engineLane) return { ...lane, readyAt: null, idle: [], rightLabel: null };
    return {
      ...lane,
      readyAt: engineLane.isStarting ? null : engineLane.readyAt,
      idle: engineLane.idle.map(({ from, to }) => ({
        from,
        to,
        label: to - from >= WAIT_LABEL_MIN_SECONDS ? `idle ${formatClock(to - from)}` : null,
      })),
      rightLabel: engineLane.stacks ? toStacksNote(engineLane.stacks) : toQueuedNote(lane.items),
    };
  });
};

// Hexite and Flux banks and the free supply, from the samples of the simulation.
export const toResourceTracks = (result: SimulationResult, totalSeconds: number): ResourceTracks => {
  const samples = result.samples.length > 0 ? result.samples : [{ t: 0, hexite: 0, flux: 0, supplyUsed: 0, supplyCap: null }];
  const hexite = toFlatEnd(samples.map(({ t, hexite: value }) => ({ t, value })), totalSeconds);
  const flux = toFlatEnd(samples.map(({ t, flux: value }) => ({ t, value })), totalSeconds);
  const hexitePeak = toPeak(hexite);
  const fluxPeak = toPeak(flux);
  return {
    hexite: { points: hexite, max: Math.max(MIN_BANK_SCALE, hexitePeak), label: `peak ${Math.round(hexitePeak)}` },
    flux: { points: flux, max: Math.max(MIN_BANK_SCALE, fluxPeak), label: `peak ${Math.round(fluxPeak)}` },
    supply: result.supply.isChecked ? toSupplyFreeTrack(samples, totalSeconds) : null,
  };
};

// Legend: the kinds of the items, plus idle time before the hero (always last).
export const toFullLegendKinds = (kinds: LegendKind[], lanes: FullLane[]) => {
  if (!lanes.some(({ idle }) => idle.length > 0)) return kinds;
  const heroIndex = kinds.indexOf('hero');
  return heroIndex === -1 ? [...kinds, 'idle' as const] : [...kinds.slice(0, heroIndex), 'idle' as const, 'hero' as const];
};

// Supply free = max(0, cap - used) as stairs, the only supply value worth reading (Kieirra 2026-11-19); '12 free'.
const toSupplyFreeTrack = (samples: ResourceSample[], totalSeconds: number) => {
  const free = samples.flatMap(({ t, supplyUsed, supplyCap }) => (supplyCap === null ? [] : [{ t, value: Math.max(0, supplyCap - supplyUsed) }]));
  const last = free.at(-1);
  if (!last) return null;
  const points = toFlatEnd(toStepPoints(free), totalSeconds);
  return { points, max: Math.max(MIN_SUPPLY_SCALE, toPeak(points)), label: `${formatSupply(last.value)} free` };
};

// 'stacks 2/4' when the stack rule is known, 'stacks ?/4' otherwise.
const toStacksNote = ({ max, isKnown, points }: StackGauge): LaneNote =>
  isKnown
    ? { text: `stacks ${points.at(-1)?.count ?? max}/${max}`, tone: 'muted' }
    : { text: `stacks ?/${max}`, tone: 'warn' };

// Time during which at least one order waited in this queue after its click (the building itself excluded).
const toQueuedNote = (items: TimelineItem[]): LaneNote | null => {
  const waits = items
    .filter(({ shape, clickAt, startAt }) => shape !== 'building' && clickAt !== null && startAt !== null && startAt > clickAt)
    .map(({ clickAt, startAt }) => ({ from: clickAt ?? 0, to: startAt ?? 0 }))
    .sort((a, b) => a.from - b.from);
  let total = 0;
  let coveredUntil = -Infinity;
  for (const { from, to } of waits) {
    total += Math.max(0, to - Math.max(from, coveredUntil));
    coveredUntil = Math.max(coveredUntil, to);
  }
  return Math.round(total) >= 1 ? { text: `queued ${formatClock(total)}`, tone: 'click' } : null;
};

// Stairs: the value holds until the sample where it changes.
const toStepPoints = (points: CurvePoint[]) =>
  points.flatMap((point, index) => {
    const previous = points[index - 1];
    return previous && previous.value !== point.value ? [{ t: point.t, value: previous.value }, point] : [point];
  });

// A single sample (empty build) is held to the end of the axis so the track still shows a line.
const toFlatEnd = (points: CurvePoint[], totalSeconds: number) =>
  points.length > 1 ? points : [...points, { t: totalSeconds, value: points[0]?.value ?? 0 }];

const toPeak = (points: CurvePoint[]) => Math.max(0, ...points.map(({ value }) => value));
