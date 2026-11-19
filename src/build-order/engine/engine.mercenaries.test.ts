import { describe, expect, it } from 'vitest';
import { known, unknown } from './engine.fixtures.ts';
import { simulateReal, toBuild, toRealContext } from './engine.wiki-fixtures.ts';
import type { Build } from '../build-order.types.ts';
import type { ResolvedGameValues } from '../game-data/game-data.helpers.ts';
import type { SimulationContext, SimulationResult } from './engine.types.ts';

const BULWARK = 'marran/building/marran-bulwark';
const SKIMMER = 'marran/unit/marran-pulse-skimmer';
const SHARPSHOOTER = 'marran/unit/marran-sharpshooter';
const SUPPLY_PLATFORM = 'protectorate/building/supply-platform';
const BARRACKS = 'protectorate/building/barracks';
const COMMANDO = 'protectorate/unit/commando';

// Bulwark at 0:00 (ready at 0:50), recruits 'u1', 'u2'…
const marranBuild = (recruits: number) => toBuild('protectorate', 'marran', [[BULWARK, 0]], Array<string>(recruits).fill(SKIMMER));

const withValues = (build: Build, values: Partial<ResolvedGameValues>): SimulationContext => {
  const context = toRealContext(build);
  return { ...context, values: { ...context.values, ...values } };
};

// Bulwark without data stacks (before Steam build 26626645) and supply unchecked: the stack game values alone apply.
const simulateFallback = (build: Build, values: Partial<ResolvedGameValues> = {}) => {
  const context = withValues(build, { startingSupply: unknown(), ...values });
  const catalog = new Map(context.catalog);
  const bulwark = catalog.get(BULWARK);
  if (bulwark) catalog.set(BULWARK, { ...bulwark, productionCharges: undefined });
  return simulateReal(build, { ...context, catalog });
};

const recruitsOf = (result: SimulationResult) => result.orders.filter(({ entityId }) => entityId === SKIMMER);

const codesOf = (result: SimulationResult, stepUid: string) =>
  result.steps.find((timing) => timing.stepUid === stepUid)?.diagnostics.map(({ code }) => code) ?? [];

const bulwarkLane = (result: SimulationResult) => result.lanes.find(({ entityId }) => entityId === BULWARK);

describe('Mercenaries: unknown stack rule (CA5)', () => {
  const result = simulateFallback(marranBuild(5));

  it('should place the 5 recruits as instant orders on the Bulwark', () => {
    const recruits = recruitsOf(result);

    expect(recruits).toHaveLength(5);
    expect(recruits.every(({ startAt, endAt }) => startAt !== null && startAt === endAt)).toBe(true);
    expect(recruits.every(({ laneId }) => laneId === bulwarkLane(result)?.id)).toBe(true);
  });

  it('should warn on the recruit launched once the stacks are spent', () => {
    expect(['u1', 'u2', 'u3', 'u4'].flatMap((uid) => codesOf(result, uid))).toEqual([]);
    expect(codesOf(result, 'u5')).toEqual(['unknown-stack-rule']);
    expect(result.steps.find(({ stepUid }) => stepUid === 'u5')?.diagnostics[0]).toMatchObject({
      severity: 'warning',
      message: 'Stack recharge unknown: more than 4 recruits from one building may not be possible.',
    });
  });

  it('should expose an unknown gauge of 4 stacks on the lane', () => {
    const lane = bulwarkLane(result);

    expect(lane?.stacks).toMatchObject({ max: 4, isKnown: false });
    expect(lane?.stacks?.points[0]).toEqual({ t: lane?.readyAt, count: 4 });
    expect(lane?.stacks?.points.at(-1)?.count).toBe(0);
    expect(lane?.idle).toEqual([]);
  });
});

describe('Mercenaries: known stack rule (CA6)', () => {
  const result = simulateFallback(marranBuild(5), {
    startingHexite: known(5000),
    mercenaryInitialStacks: known(4),
    mercenaryStackRechargeSeconds: known(60),
  });
  const recruits = recruitsOf(result);

  it('should release the 5th recruit only when a stack comes back, 60 s after the 1st one', () => {
    expect(recruits.slice(0, 4).map(({ startAt }) => startAt)).toEqual([50, 50, 50, 50]);
    expect(recruits[4]).toMatchObject({ clickAt: 110, startAt: 110, waits: {} });
    expect(codesOf(result, 'u5')).toEqual([]);
  });

  it('should expose a known gauge with the recharge', () => {
    const lane = bulwarkLane(result);

    expect(lane?.stacks?.isKnown).toBe(true);
    expect(lane?.stacks?.points).toContainEqual({ t: 110, count: 1 });
  });
});

describe('Mercenaries: recruits never hold the others', () => {
  // No harvester: the Flux of the Sharpshooter never comes, the Supply Platform still starts at its click time.
  it('should start a later building while a recruit waits for its resources', () => {
    const result = simulateReal(toBuild('protectorate', 'marran', [[BULWARK, 0], [SUPPLY_PLATFORM, 60]], [SHARPSHOOTER]));
    const platform = result.orders.find(({ stepUid }) => stepUid === 'b2');

    expect(platform).toMatchObject({ clickAt: 60, startAt: 60, waits: {} });
    expect(result.orders.find(({ stepUid }) => stepUid === 'u1')).toMatchObject({ clickAt: 50, startAt: null });
  });

  it('should recruit on its own building, never held behind the units of the Barracks', () => {
    const commandos = Array<string>(8).fill(COMMANDO);
    const result = simulateReal(
      toBuild('protectorate', 'marran', [[SUPPLY_PLATFORM, 0], [BARRACKS, 15], [SUPPLY_PLATFORM, 30], [BULWARK, 60]], [...commandos, SKIMMER, SKIMMER]),
    );
    const lane = bulwarkLane(result);
    const lastCommando = result.orders.filter(({ entityId }) => entityId === COMMANDO).at(-1);

    expect(recruitsOf(result).every(({ laneId, clickAt }) => laneId === lane?.id && (clickAt ?? 0) >= (lane?.readyAt ?? Infinity))).toBe(true);
    expect(recruitsOf(result)[0].startAt).toBeLessThan(lastCommando?.clickAt ?? 0);
    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  });

  it('should not recruit before its click time (CA14)', () => {
    const build = marranBuild(1);
    const result = simulateReal({ ...build, queued: [{ ...build.queued[0], at: 120 }] });

    expect(recruitsOf(result)[0]).toMatchObject({ clickAt: 120, startAt: 120 });
  });
});

describe('Mercenaries: faction without mercenary', () => {
  it('should report mercenary-not-allowed when the rules forbid a mercenary', () => {
    const build = marranBuild(1);
    const context = toRealContext(build);
    const result = simulateReal(build, {
      ...context,
      rules: { ...context.rules, mercenaryAllowed: { ...context.rules.mercenaryAllowed, value: false } },
    });

    expect(result.diagnostics).toContainEqual({
      code: 'mercenary-not-allowed',
      severity: 'error',
      message: 'This faction plays without a mercenary.',
    });
  });

  it('should not report it when the mercenary is allowed', () => {
    expect(simulateReal(marranBuild(1)).diagnostics).not.toContainEqual(expect.objectContaining({ code: 'mercenary-not-allowed' }));
  });
});
