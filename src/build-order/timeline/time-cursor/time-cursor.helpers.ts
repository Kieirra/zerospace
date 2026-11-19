import { formatAmount, formatClock, formatSupply } from '../../build-order.helpers.ts';
import type { ResourceSample, SimulationResult } from '../../engine/engine.types.ts';
import type { GameStateAt, TimeScale } from '../timeline.types.ts';

// Game state at `t`, read from the simulation already computed: never simulates again. The banks and the supply only,
// no running nor waiting orders (Kieirra 2026-11-19).
export const getStateAt = (result: SimulationResult, t: number): GameStateAt => {
  const { hexite, flux } = interpolateSample(result.samples, t);
  const supply = toStepSample(result.samples, t);
  return {
    t,
    hexite: Math.round(hexite),
    flux: Math.round(flux),
    supplyUsed: supply?.supplyUsed ?? 0,
    supplyCap: supply?.supplyCap ?? null,
    isSupplyChecked: result.supply.isChecked,
  };
};

// Hexite and Flux, linear between the two samples around `t`; first or last sample outside them.
export const interpolateSample = (samples: ResourceSample[], t: number) => {
  const nextIndex = samples.findIndex((sample) => sample.t > t);
  if (nextIndex === -1) return samples.at(-1) ?? EMPTY_SAMPLE;
  if (nextIndex === 0) return samples[0];
  const before = samples[nextIndex - 1];
  const after = samples[nextIndex];
  const ratio = (t - before.t) / (after.t - before.t);
  return {
    ...before,
    hexite: before.hexite + (after.hexite - before.hexite) * ratio,
    flux: before.flux + (after.flux - before.flux) * ratio,
  };
};

// Time under the pointer, from its x on the track, on the whole second shown by the card; null outside [0, endTime]
// (no cursor there).
export const toCursorTime = (pointerX: number, scale: TimeScale, endTime: number) => {
  const t = pointerX / scale.pixelsPerSecond;
  return t < 0 || t > endTime ? null : Math.min(endTime, Math.round(t));
};

export const clampCursorTime = (t: number, endTime: number) => Math.min(endTime, Math.max(0, t));

// 'Supply 14 / ?', 'Supply 14 / 50', 'Supply 14'
export const toSupplyText = ({ supplyUsed, supplyCap, isSupplyChecked }: GameStateAt) => {
  const used = formatSupply(supplyUsed);
  if (!isSupplyChecked) return `${used} / ?`;
  return supplyCap === null ? used : `${used} / ${formatSupply(supplyCap)}`;
};

// Read by screen readers: '1:40, Hexite 450, Flux 61, Supply 14 / ?'
export const toCursorAnnouncement = (state: GameStateAt) =>
  `${formatClock(state.t)}, Hexite ${formatAmount(state.hexite)}, Flux ${formatAmount(state.flux)}, Supply ${toSupplyText(state)}`;

const toStepSample = (samples: ResourceSample[], t: number) => samples.findLast((sample) => sample.t <= t) ?? samples[0];

const EMPTY_SAMPLE: ResourceSample = { t: 0, hexite: 0, flux: 0, supplyUsed: 0, supplyCap: null };
