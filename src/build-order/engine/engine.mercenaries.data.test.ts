import { describe, expect, it } from 'vitest';
import { hasOrder, known, unknown } from './engine.fixtures.ts';
import { simulateReal, toBuild, toRealContext } from './engine.wiki-fixtures.ts';
import type { Build } from '../build-order.types.ts';
import type { ResolvedGameValues } from '../game-data/game-data.helpers.ts';
import type { SimulationContext } from './engine.types.ts';

// Mercenary stacks read from the real data (`productionCharges`, Steam build 26626645).
const BULWARK = 'marran/building/marran-bulwark';
const SKIMMER = 'marran/unit/marran-pulse-skimmer';

const withValues = (build: Build, values: Partial<ResolvedGameValues>): SimulationContext => {
  const context = toRealContext(build);
  return { ...context, values: { ...context.values, ...values } };
};

describe('Mercenaries: stacks of the data (1 at completion, 4 max, +1 every 90 s)', () => {
  const build = toBuild('protectorate', 'marran', [[BULWARK, 0]], [SKIMMER, SKIMMER, SKIMMER]);
  // More recruits than the starting 15 supply holds: the supply is left unchecked to test the stacks alone.
  const result = simulateReal(build, withValues(build, { startingSupply: unknown(), startingHexite: known(5000) }));
  const recruits = result.orders.filter(({ entityId }) => entityId === SKIMMER);
  const lane = result.lanes.find(({ entityId }) => entityId === BULWARK);

  it('should recruit the 1st one at completion, then one per recharge', () => {
    expect(lane?.readyAt).toBe(50);
    expect(recruits.map(({ startAt }) => startAt)).toEqual([50, 140, 230]);
    expect(result.diagnostics.filter(({ severity }) => severity !== 'info')).toEqual([]);
  });

  it('should expose a known gauge starting at 1 stack', () => {
    expect(lane?.stacks).toMatchObject({ max: 4, isKnown: true });
    expect(lane?.stacks?.points[0]).toEqual({ t: 50, count: 1 });
  });
});

// First building and one recruit it produces, for each mercenary of the real data; Flux given since the base mines none.
const MERCENARY_RECRUITS: [string, string, string][] = [
  ['arandi', 'arandi/building/arandi-penumbra', 'arandi/unit/arandi-phoenix-guard'],
  ['chakru-kingdom', 'chakru-kingdom/building/temple-of-anqas', 'chakru-kingdom/unit/chakru-chaski'],
  ['chakru-kingdom', 'chakru-kingdom/building/temple-of-stars', 'chakru-kingdom/unit/chakru-clakjaw'],
  ['endari', 'endari/building/silent-hollow', 'endari/unit/endari-shade'],
  ['free-corsairs', 'free-corsairs/building/free-corsair-mercenary-outpost', 'free-corsairs/unit/corsair-raider'],
  ['marran', BULWARK, SKIMMER],
  ['valkaru', 'valkaru/building/valkaru-war-vault', 'valkaru/unit/valkaru-hound'],
];

describe('Mercenaries: real recruits of each mercenary', () => {
  it.each(MERCENARY_RECRUITS)('should recruit instantly with a stack when %s builds %s', (mercenaryId, building, unit) => {
    const build = toBuild('protectorate', mercenaryId, [[building, 0]], [unit]);
    const result = simulateReal(build, withValues(build, { startingFlux: known(500) }));
    const lane = result.lanes.find(({ entityId }) => entityId === building);
    const recruit = result.orders.find(({ entityId }) => entityId === unit);

    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(recruit?.laneId).toBe(lane?.id);
    expect(recruit?.startAt).not.toBeNull();
    expect(recruit?.startAt).toBe(recruit?.endAt);
    expect(lane?.stacks).toMatchObject({ max: 4, isKnown: true });
    expect(lane?.stacks?.points.at(-1)?.count).toBe(0);
  });
});

// Mazar 2026-11-13: never twice the same mercenary building; a mercenary with two buildings (Chakru) may have both.
describe('Mercenaries: one copy of each mercenary building', () => {
  const ANQAS = 'chakru-kingdom/building/temple-of-anqas';
  const STARS = 'chakru-kingdom/building/temple-of-stars';

  // Over time: the copy clicked later is the one refused, whatever its place in `timed`.
  it('should refuse the later Marran Bulwark and ignore it', () => {
    const result = simulateReal(toBuild('protectorate', 'marran', [[BULWARK, 30], [BULWARK, 10]], [SKIMMER]));
    const late = result.steps.find(({ stepUid }) => stepUid === 'b1');

    expect(hasOrder(result, { uid: 'b1' })).toBe(false);
    expect(late?.diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate-mercenary-building',
        severity: 'error',
        message: 'Only one Marran Bulwark per match: already built at 0:10.',
      }),
    ]);
    expect(result.lanes.filter(({ entityId }) => entityId === BULWARK).map(({ id }) => id)).toEqual(['lane:b2']);
  });

  it('should allow both Chakru temples, each with its own stacks', () => {
    const build = toBuild(
      'protectorate',
      'chakru-kingdom',
      [[ANQAS, 0], [STARS, 0]],
      ['chakru-kingdom/unit/chakru-chaski', 'chakru-kingdom/unit/chakru-clakjaw'],
    );
    const result = simulateReal(build, withValues(build, { startingHexite: known(5000), startingFlux: known(500) }));

    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    for (const temple of [ANQAS, STARS]) {
      const lane = result.lanes.find(({ entityId }) => entityId === temple);
      expect(lane?.stacks?.points.map(({ count }) => count)).toEqual([1, 0]);
    }
  });
});
