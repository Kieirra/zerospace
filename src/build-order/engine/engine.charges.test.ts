import { describe, expect, it } from 'vitest';
import { simulateBuild } from './engine.ts';
import { toXolBuild, toXolContext } from './engine.wiki-fixtures.ts';
import type { Build } from '../build-order.types.ts';

// Production charges of the Xol producers (US-009): 1 when built, +1 every 35 s, 4 at most; a charge makes the unit at once.
const POWER_CORE = 'the-xol/building/power-core';
const GYROFORGE = 'the-xol/building/gyroforge';
const ROLLER = 'the-xol/unit/roller';
const OVERCLOCKED = 'the-xol/talent/overclocked-production';

const simulate = (build: Build) => simulateBuild(build, toXolContext(build));

const startsOf = (build: Build, entityId: string, laneId?: string) =>
  simulate(build)
    .orders.filter((order) => order.entityId === entityId && (laneId === undefined || order.laneId === laneId))
    .map(({ startAt, endAt }) => [startAt, endAt]);

// Power Core 0:00 (ready 0:03), Gyroforge clicked 0:05: ready at 0:55.
const READY = 55;

describe('Xol production charges', () => {
  it('should make 3 Rollers at once with a charge each: at completion, +35 s, +70 s (CA4)', () => {
    const build = toXolBuild([[POWER_CORE, 0], [GYROFORGE, 5]], [{ entityId: ROLLER }, { entityId: ROLLER }, { entityId: ROLLER }]);
    const result = simulate(build);

    expect(startsOf(build, ROLLER)).toEqual([
      [READY, READY],
      [READY + 35, READY + 35],
      [READY + 70, READY + 70],
    ]);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain('unknown-duration');
    expect(result.lanes.find(({ entityId }) => entityId === GYROFORGE)?.stacks).toMatchObject({ max: 4, isKnown: true });
  });

  it('should store 4 charges at most: 4 Rollers at once, the 5th one recharge later (CA5)', () => {
    const at = READY + 140;
    const build = toXolBuild([[POWER_CORE, 0], [GYROFORGE, 5]], Array.from({ length: 5 }, () => ({ entityId: ROLLER, at })));

    expect(startsOf(build, ROLLER).map(([start]) => start)).toEqual([at, at, at, at, at + 35]);
  });

  it('should give Overclocked Production to the producers completed after it only: 5 charges, 28 s (CA6)', () => {
    // Gyroforge A ready 0:55, the talent at 1:00, Gyroforge B ready 1:30.
    const rollers = (producerUid: string) => Array.from({ length: 3 }, () => ({ entityId: ROLLER, producerUid }));
    const build = toXolBuild([[POWER_CORE, 0], [GYROFORGE, 5], [GYROFORGE, 40], [OVERCLOCKED, 60]], [...rollers('b2'), ...rollers('b3')]);
    const result = simulate(build);
    const laneOf = (uid: string) => result.lanes.find(({ id }) => id === `lane:${uid}`);

    expect(laneOf('b2')?.stacks?.max).toBe(4);
    expect(laneOf('b3')?.stacks?.max).toBe(5);
    expect(startsOf(build, ROLLER, 'lane:b2').map(([start]) => start)).toEqual([55, 90, 125]);
    expect(startsOf(build, ROLLER, 'lane:b3').map(([start]) => start)).toEqual([90, 118, 146]);
  });

  it('should loop a Roller at each charge until the last step outside the loop is done', () => {
    const build = toXolBuild([[POWER_CORE, 0], [GYROFORGE, 5], [POWER_CORE, 150]], [{ entityId: ROLLER, repeat: true }]);
    const starts = startsOf(build, ROLLER).map(([start]) => start);

    expect(starts).toEqual([READY, READY + 35, READY + 70]);
  });
});
