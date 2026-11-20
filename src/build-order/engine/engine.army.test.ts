import { describe, expect, it } from 'vitest';
import { REPLICATE_UID } from '../build-order.types.ts';
import { simulateBuild } from './engine.ts';
import { toXolBuild, toXolContext } from './engine.wiki-fixtures.ts';
import type { Build } from '../build-order.types.ts';
import type { SimulationResult } from './engine.types.ts';

// The army of the engine (US-009): every unit made, never lost; a merge takes the oldest free ones.
const ID = (path: string) => `the-xol/${path}`;

// Producers ready 0:55, World Forge ready 2:50.
const TIMED: [string, number][] = [
  [ID('building/power-core'), 0],
  [ID('building/gyroforge'), 5],
  [ID('building/spectral-foundry'), 5],
  [ID('building/molten-core'), 55],
  [ID('building/world-forge'), 95],
];

const unit = (slug: string, at?: number) => ({ entityId: ID(`unit/${slug}`), ...(at === undefined ? {} : { at }) });

const simulate = (build: Build) => simulateBuild(build, toXolContext(build));

const orderOf = (result: SimulationResult, stepUid: string) => {
  const order = result.orders.find((timing) => timing.stepUid === stepUid && timing.occurrence === 0);
  if (!order) throw new Error(`No order ${stepUid}`);
  return order;
};

describe('Xol army', () => {
  it('should count a pack of 2 Rollers as 2 units, taken by one Echo', () => {
    const result = simulate(toXolBuild(TIMED, [unit('roller'), unit('echo')]));

    expect(orderOf(result, 'u2').inputs).toEqual([expect.objectContaining({ stepUid: 'u1', count: 2 })]);
    expect(orderOf(result, 'u1').takenBy).toEqual([expect.objectContaining({ stepUid: 'u2', count: 2 })]);
  });

  it('should take the oldest Rollers first: 2 of the first pack, 1 of the second, the 4th one left free', () => {
    const result = simulate(toXolBuild(TIMED, [unit('roller'), unit('roller'), unit('gravitron'), unit('echo', 200)]));
    const gravitron = orderOf(result, 'u3');

    expect(gravitron.inputs).toEqual([
      expect.objectContaining({ stepUid: 'u1', count: 2, readyAt: 55 }),
      expect.objectContaining({ stepUid: 'u2', count: 1, readyAt: 90 }),
    ]);
    expect(orderOf(result, 'u2').takenBy).toEqual([{ stepUid: 'u3', startAt: gravitron.startAt, count: 1 }]);
    // The Echo needs 2: one Roller is left, it never starts.
    expect(orderOf(result, 'u4').startAt).toBeNull();
    expect(orderOf(result, 'u4').inputStatus?.[0]).toMatchObject({ count: 2, free: 1 });
  });

  it('should let a copy join the army: copied again, then merged', () => {
    const result = simulate(
      toXolBuild(TIMED, [
        unit('spectron'),
        { entityId: ID('unit/spectron'), producerUid: REPLICATE_UID },
        { entityId: ID('unit/spectron'), producerUid: REPLICATE_UID, at: 80 },
        unit('eradicator'),
      ]),
    );
    const secondCopy = orderOf(result, 'u3');
    const eradicator = orderOf(result, 'u4');

    expect(eradicator.startAt).toBe(Math.max(secondCopy.endAt ?? Infinity, 170));
    expect(eradicator.inputs?.map(({ stepUid }) => stepUid)).toEqual(['u1', 'u2', 'u3']);
  });
});
