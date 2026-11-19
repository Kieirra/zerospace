import { describe, expect, it } from 'vitest';
import { formatClock } from '../build-order.helpers.ts';
import { hasOrder } from './engine.fixtures.ts';
import { simulateReal, toBuild } from './engine.wiki-fixtures.ts';
import type { Build } from '../build-order.types.ts';
import type { SimulationResult } from './engine.types.ts';

const KRAEGAR = 'the-legion/hero/kraegar';
const INQUISITRESS = 'the-legion/hero/inquisitress';
const GALAVAX = 'the-legion/hero/galavax';
const LABOURER = 'the-legion/unit/legion-labourer';
const ALTAR = 'the-legion/building/altar';

// Labourers mine the Flux of the heroes; three Idal Conduits (15 + 3 × 12 supply) hold the three heroes.
const LEGION_TO_ALTAR: [string, number][] = [
  ['the-legion/building/idal-conduit', 20],
  ['the-legion/building/barracks', 35],
  ['the-legion/building/bestiary', 40],
  ['the-legion/building/citadel', 90],
  [ALTAR, 140],
  ['the-legion/building/idal-conduit', 150],
  ['the-legion/building/idal-conduit', 160],
];

const withHero = (build: Build, heroId: string | null): Build => ({ ...build, heroId });

// Heroes queued after three labourers: their uids are 'u4', 'u5'…
const legionBuild = (heroIds: string[], setupHeroId: string | null = KRAEGAR, after: string[] = []) =>
  withHero(toBuild('the-legion', null, LEGION_TO_ALTAR, [LABOURER, LABOURER, LABOURER, ...heroIds, ...after]), setupHeroId);

const orderOf = (result: SimulationResult, stepUid: string) => {
  const order = result.orders.find((timing) => timing.stepUid === stepUid);
  if (!order) throw new Error(`No order ${stepUid}`);
  return order;
};

const stepOf = (result: SimulationResult, stepUid: string) => {
  const step = result.steps.find((timing) => timing.stepUid === stepUid);
  if (!step) throw new Error(`No step ${stepUid}`);
  return step;
};

const codesOf = (result: SimulationResult, stepUid: string) => stepOf(result, stepUid).diagnostics.map(({ code }) => code);

const supplyAt = (result: SimulationResult, second: number) => result.samples.find(({ t }) => t === second)?.supplyUsed;

const altarOf = (result: SimulationResult) => result.lanes.find(({ entityId }) => entityId === ALTAR);

describe('Heroes: free setup hero at 0:15 (CA1)', () => {
  const result = simulateReal(withHero(toBuild('protectorate', 'marran', []), 'protectorate/hero/prefect-aster'));

  it('should spawn the setup hero at 0:15 with its supply and no cost', () => {
    expect(result.heroes.setup).toEqual({ entityId: 'protectorate/hero/prefect-aster', at: 15, supply: 10 });
    expect(supplyAt(result, 14)).toBe(0);
    expect(supplyAt(result, 15)).toBe(10);
    expect(result.supply.used).toBe(10);
  });

  it('should never turn the setup hero into an order', () => {
    expect(result.orders).toEqual([]);
  });

  it('should count both units of Mondar and Torq', () => {
    const valkaru = simulateReal(withHero(toBuild('protectorate', 'valkaru', []), 'valkaru/hero/mondar-and-torq'));

    expect(valkaru.heroes.setup?.supply).toBe(10);
    expect(supplyAt(valkaru, 15)).toBe(10);
  });

  it('should have no setup hero and no diagnostic without a hero', () => {
    const empty = simulateReal(toBuild('protectorate', 'marran', []));

    expect(empty.heroes.setup).toBeNull();
    expect(empty.diagnostics).not.toContainEqual(expect.objectContaining({ code: 'hero-not-in-pool' }));
  });
});

describe('Heroes: hero outside the pool (CA Error)', () => {
  it('should report hero-not-in-pool, drop the setup hero and go on', () => {
    const result = simulateReal(withHero(toBuild('the-xol', 'valkaru', [], ['the-xol/unit/xol-harvester']), 'protectorate/hero/marv'));

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'hero-not-in-pool', severity: 'error' }));
    expect(result.heroes.setup).toBeNull();
    expect(supplyAt(result, 15)).toBe(supplyAt(result, 14));
    expect(orderOf(result, 'u1').endAt).not.toBeNull();
  });

  it('should accept the mercenary hero for the Xol', () => {
    const result = simulateReal(withHero(toBuild('the-xol', 'valkaru', []), 'valkaru/hero/mondar-and-torq'));

    expect(result.heroes.setup?.entityId).toBe('valkaru/hero/mondar-and-torq');
    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  });

  it('should refuse a mercenary hero for the Legion', () => {
    const result = simulateReal(withHero(toBuild('the-legion', 'marran', []), 'marran/hero/hel'));

    expect(result.heroes.setup).toBeNull();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'hero-not-in-pool' }));
  });
});

describe('Heroes: paid heroes of the Legion, one at a time at the Altar (CA2)', () => {
  const result = simulateReal(legionBuild([INQUISITRESS, GALAVAX]));
  const inquisitress = orderOf(result, 'u4');
  const galavax = orderOf(result, 'u5');

  it('should queue the first hero when the Altar is ready and the second one when the first ends', () => {
    const altar = altarOf(result);

    expect(inquisitress).toMatchObject({ laneId: altar?.id, clickAt: altar?.readyAt });
    expect(galavax).toMatchObject({ laneId: altar?.id, clickAt: inquisitress.endAt });
  });

  it('should pay the heroes and count their supply, the setup hero included', () => {
    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(galavax.endAt).not.toBeNull();
    expect(result.supply.used).toBe(30);
  });

  it('should summarize the heroes, the last one on the field included', () => {
    expect(result.heroes).toEqual({
      setup: { entityId: KRAEGAR, at: 15, supply: 10 },
    });
  });
});

describe('Heroes: hero step diagnostics', () => {
  it('should ignore a paid hero outside the Legion (CA4)', () => {
    const result = simulateReal(toBuild('protectorate', null, [], ['protectorate/hero/marv']));

    expect(codesOf(result, 'u1')).toEqual(['hero-not-buildable']);
    expect(hasOrder(result, { uid: 'u1' })).toBe(false);
    expect(result.orders).toEqual([]);
  });

  it('should ignore the setup hero as a step', () => {
    const result = simulateReal(legionBuild([KRAEGAR]));

    expect(codesOf(result, 'u4')).toEqual(['hero-already-picked']);
    expect(hasOrder(result, { uid: 'u4' })).toBe(false);
  });

  it('should ignore a paid hero built twice, with the start of the first one', () => {
    const result = simulateReal(legionBuild([INQUISITRESS, INQUISITRESS]));
    const first = orderOf(result, 'u4');

    expect(first.startAt).toBe(altarOf(result)?.readyAt);
    expect(codesOf(result, 'u5')).toEqual(['hero-duplicate']);
    expect(stepOf(result, 'u5').diagnostics[0].message).toBe(`Already built at ${formatClock(first.startAt ?? 0)}.`);
    expect(hasOrder(result, { uid: 'u5' })).toBe(false);
  });

  it('should keep a third paid hero with hero-no-slot', () => {
    const result = simulateReal(legionBuild([INQUISITRESS, GALAVAX, KRAEGAR], null));

    expect(codesOf(result, 'u6')).toEqual(['hero-no-slot']);
    expect(stepOf(result, 'u6').diagnostics[0].message).toBe('No hero slot left: 3 heroes at most.');
    expect(hasOrder(result, { uid: 'u6' })).toBe(true);
  });

  it('should not hold a later labourer behind the heroes waiting for the Altar', () => {
    const result = simulateReal(legionBuild([INQUISITRESS, GALAVAX], KRAEGAR, [LABOURER]));

    expect(orderOf(result, 'u6')).toMatchObject({ laneId: 'lane:base' });
    expect(orderOf(result, 'u6').endAt).toBeLessThan(altarOf(result)?.readyAt ?? 0);
  });
});
