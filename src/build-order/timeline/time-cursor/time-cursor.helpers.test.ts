import { describe, expect, it } from 'vitest';
import { result } from '../timeline.fixtures.ts';
import {
  clampCursorTime,
  getStateAt,
  interpolateSample,
  toCursorAnnouncement,
  toCursorTime,
  toSupplyText,
} from './time-cursor.helpers.ts';
import type { ResourceSample } from '../../engine/engine.types.ts';

const sample = (t: number, hexite: number, flux: number, supplyUsed = 4): ResourceSample => ({
  t,
  hexite,
  flux,
  supplyUsed,
  supplyCap: null,
});

const SAMPLES = [sample(99, 440, 55), sample(100, 450, 61), sample(101, 470, 67, 6)];

const SIMULATED = result({ samples: SAMPLES, endTime: 200 });

describe('interpolateSample', () => {
  it('should read Hexite and Flux linearly between the two samples around t', () => {
    expect(interpolateSample(SAMPLES, 100.5)).toMatchObject({ hexite: 460, flux: 64 });
  });

  it('should hold the first and last samples outside them', () => {
    expect(interpolateSample(SAMPLES, 50)).toMatchObject({ hexite: 440 });
    expect(interpolateSample(SAMPLES, 300)).toMatchObject({ hexite: 470 });
    expect(interpolateSample([], 10)).toMatchObject({ hexite: 0, flux: 0 });
  });
});

describe('getStateAt', () => {
  it('should give the rounded banks and the supply at t, nothing about the orders', () => {
    expect(getStateAt(SIMULATED, 100.4)).toEqual({
      t: 100.4,
      hexite: 458,
      flux: 63,
      supplyUsed: 4,
      supplyCap: null,
      isSupplyChecked: false,
    });
  });
});

describe('toCursorTime', () => {
  const scale = { totalSeconds: 240, pixelsPerSecond: 4 };

  it('should turn the pointer x on the track into a time', () => {
    expect(toCursorTime(400, scale, 200)).toBe(100);
  });

  it('should round the time to the second shown by the card, within the end of the build', () => {
    expect([toCursorTime(398.5, scale, 200), toCursorTime(401.9, scale, 200), toCursorTime(802, scale, 200.6)]).toEqual([
      100, 100, 200.6,
    ]);
  });

  it('should give no time before 0 or after the end of the build', () => {
    expect(toCursorTime(-1, scale, 200)).toBeNull();
    expect(toCursorTime(804, scale, 200)).toBeNull();
    expect(toCursorTime(800, scale, 200)).toBe(200);
  });

  it('should keep a keyboard move within [0, endTime]', () => {
    expect([clampCursorTime(-5, 200), clampCursorTime(205, 200), clampCursorTime(15, 200)]).toEqual([0, 200, 15]);
  });
});

describe('toSupplyText and toCursorAnnouncement', () => {
  const state = getStateAt(SIMULATED, 100);

  it('should mark an unchecked supply with / ?', () => {
    expect(toSupplyText(state)).toBe('4 / ?');
    expect(toSupplyText({ ...state, isSupplyChecked: true, supplyCap: 50 })).toBe('4 / 50');
    expect(toSupplyText({ ...state, isSupplyChecked: true })).toBe('4');
  });

  it('should announce the time and the resources', () => {
    expect(toCursorAnnouncement(state)).toBe('1:40, Hexite 450, Flux 61, Supply 4 / ?');
  });
});

describe('getStateAt without samples', () => {
  it('should give an empty state without error when the build has no sample', () => {
    expect(getStateAt(result(), 0)).toMatchObject({ hexite: 0, flux: 0, supplyUsed: 0 });
  });
});
