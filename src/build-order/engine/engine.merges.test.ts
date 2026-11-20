import { describe, expect, it } from 'vitest';
import { simulateBuild } from './engine.ts';
import { toXolBuild, toXolContext } from './engine.wiki-fixtures.ts';
import type { Build, QueuedStep } from '../build-order.types.ts';
import type { SimulationResult } from './engine.types.ts';

// Xol merges (US-009): inputs taken at the start, the supplement paid, build time / 1.5, supply kept.
const ID = (path: string) => `the-xol/${path}`;
const POWER_CORE = ID('building/power-core');
const GYROFORGE = ID('building/gyroforge');
const XYTHER_ASSEMBLER = ID('building/xyther-assembler');
const SPECTRAL_FOUNDRY = ID('building/spectral-foundry');
const MOLTEN_CORE = ID('building/molten-core');
const WORLD_FORGE = ID('building/world-forge');

// Power Core ready 0:03; the producers ready 0:55; Molten Core ready 1:35; World Forge ready 2:50.
const BASE_TIMED: [string, number][] = [
  [POWER_CORE, 0],
  [GYROFORGE, 5],
  [XYTHER_ASSEMBLER, 5],
  [SPECTRAL_FOUNDRY, 5],
  [MOLTEN_CORE, 55],
  [WORLD_FORGE, 95],
];

const unit = (slug: string, fields: Omit<QueuedStep, 'uid' | 'entityId'> = {}) => ({ entityId: ID(`unit/${slug}`), ...fields });

const simulate = (build: Build) => simulateBuild(build, toXolContext(build));

const orderOf = (result: SimulationResult, stepUid: string) => {
  const order = result.orders.find((timing) => timing.stepUid === stepUid && timing.occurrence === 0);
  if (!order) throw new Error(`No order ${stepUid}`);
  return order;
};

const supplyAt = (result: SimulationResult, second: number) => result.samples.find(({ t }) => t === second)?.supplyUsed;

describe('Xol merges', () => {
  it('should merge an Echo of 2 Rollers once the Molten Core is ready: 50 Flux, 10.7 s, same supply, Gyroforge lane (CA1)', () => {
    // Without the World Forge, clicked at the same time.
    const result = simulate(toXolBuild(BASE_TIMED.slice(0, -1), [unit('roller'), unit('echo')]));
    const echo = orderOf(result, 'u2');
    const bank = (second: number) => result.samples.find(({ t }) => t === second);

    expect(echo.startAt).toBe(95);
    expect(echo.endAt).toBeCloseTo(105.7, 5);
    expect(echo.laneId).toBe('lane:b2');
    expect(echo.inputs).toEqual([{ stepUid: 'u1', occurrence: 0, laneId: 'lane:b2', readyAt: 55, count: 2 }]);
    expect(supplyAt(result, 94)).toBe(supplyAt(result, 96));
    expect((bank(96)?.flux ?? 0) - (bank(94)?.flux ?? 0)).toBe(-50);
  });

  it('should merge a Paradox after its last input, 33.3 s, on the lane of that input (CA2)', () => {
    const build = toXolBuild(BASE_TIMED, [
      unit('xyther'),
      unit('xyther'),
      unit('spectron'),
      unit('spectron'),
      unit('roller'),
      unit('defiant', { at: 180 }),
      unit('synapse', { at: 190 }),
      unit('echo', { at: 200 }),
      unit('paradox'),
    ]);
    const result = simulate(build);
    const echo = orderOf(result, 'u8');
    const paradox = orderOf(result, 'u9');

    expect(echo.endAt).toBeCloseTo(210.7, 5);
    expect(paradox.startAt).toBe(echo.endAt);
    expect((paradox.endAt ?? 0) - (paradox.startAt ?? 0)).toBeCloseTo(33.3, 5);
    expect(paradox.laneId).toBe(echo.laneId);
    expect(result.diagnostics.filter(({ severity }) => severity !== 'info')).toEqual([]);
  });

  it('should never start a Gravitron whose Rollers an Echo took, and tell why (CA3)', () => {
    const result = simulate(toXolBuild(BASE_TIMED, [unit('roller'), unit('echo'), unit('gravitron')]));
    const echo = orderOf(result, 'u2');
    const gravitron = orderOf(result, 'u3');
    const step = result.steps.find(({ stepUid }) => stepUid === 'u3');

    expect(gravitron.startAt).toBeNull();
    expect(gravitron.laneId).toBe('lane:b2');
    expect(step?.diagnostics.map(({ message }) => message)).toContain('Never starts: 3 Roller missing.');
    expect(gravitron.inputStatus).toEqual([
      { entityId: ID('unit/roller'), count: 3, free: 0, takenBy: [{ stepUid: 'u2', startAt: echo.startAt, count: 2 }] },
    ]);
    expect(orderOf(result, 'u1').takenBy).toEqual([{ stepUid: 'u2', startAt: echo.startAt, count: 2 }]);
  });

  it('should halve the merge time with Improved Systems (CA11)', () => {
    const build = toXolBuild([...BASE_TIMED, [ID('talent/improved-systems'), 0]], [unit('roller'), unit('echo')]);
    const echo = orderOf(simulate(build), 'u2');

    expect((echo.endAt ?? 0) - (echo.startAt ?? 0)).toBeCloseTo(5.3, 5);
  });

  it('should keep a merge whose tier 1 unit no building makes, in error (CA Erreur)', () => {
    const result = simulate(toXolBuild([[POWER_CORE, 0], [MOLTEN_CORE, 5]], [unit('echo')]));
    const step = result.steps.find(({ stepUid }) => stepUid === 'u1');

    expect(step?.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'missing-merge-input', severity: 'error', message: 'Needs Roller: no Gyroforge in the build.' }),
    );
    expect(orderOf(result, 'u1').laneId).toBe('lane:base');
  });

  it('should warn on the 2nd Paradox only: 1 at a time in game', () => {
    const result = simulate(toXolBuild(BASE_TIMED, [unit('paradox'), unit('paradox')]));
    const warnings = (uid: string) => result.steps.find(({ stepUid }) => stepUid === uid)?.diagnostics.filter(({ code }) => code === 'owner-limit');

    expect(warnings('u1')).toEqual([]);
    expect(warnings('u2')).toEqual([
      expect.objectContaining({ severity: 'warning', message: '1 Paradox at a time in game: the tool never loses units.' }),
    ]);
  });
});

describe('Xol Instant Power Core (CA11)', () => {
  it('should make the Power Core ready at its start', () => {
    const result = simulate(toXolBuild([[ID('talent/instant-power-core'), 0], [POWER_CORE, 0]]));
    const powerCore = orderOf(result, 'b2');

    expect(powerCore.endAt).toBe(powerCore.startAt);
  });
});

describe('Xol World Forge (CA7)', () => {
  it('should allow 3 upgrades of its group, and refuse a 4th one', () => {
    const upgrades = ['damage', 'vitals', 'weapon-range', 'armor'].map((slug, index): [string, number] => [ID(`upgrade/${slug}`), 200 + index]);
    const result = simulate(toXolBuild([...BASE_TIMED, ...upgrades]));
    const errorsOf = (uid: string) => result.steps.find(({ stepUid }) => stepUid === uid)?.diagnostics.filter(({ severity }) => severity === 'error');

    expect(['b7', 'b8', 'b9'].flatMap((uid) => errorsOf(uid) ?? [])).toEqual([]);
    expect(errorsOf('b10')?.map(({ message }) => message)).toEqual([
      'At most 3 of this group: Damage, Vitals and Weapon Range are already in the build.',
    ]);
  });
});
