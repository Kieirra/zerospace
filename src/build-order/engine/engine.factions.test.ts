import { describe, expect, it } from 'vitest';
import { simulateReal, toBuild, toRealContext } from './engine.wiki-fixtures.ts';
import type { SimulationResult } from './engine.types.ts';

const orderOf = (result: SimulationResult, stepUid: string) => {
  const order = result.orders.find((timing) => timing.stepUid === stepUid);
  if (!order) throw new Error(`No order ${stepUid}`);
  return order;
};

const hexiteAt = (result: SimulationResult, second: number) => result.samples.find(({ t }) => t === second)?.hexite ?? Number.NaN;

const times = <T,>(count: number, value: T) => Array<T>(count).fill(value);

// Timed buildings and researches at plausible click times, then the units in Auto.
const OPENINGS: Record<string, { timed: [string, number][]; queued: string[] }> = {
  protectorate: {
    timed: [
      ['protectorate/building/supply-platform', 0],
      ['protectorate/building/barracks', 15],
      ['protectorate/building/research-lab', 55],
      ['protectorate/upgrade/longshot-calibration', 80],
      ['protectorate/upgrade/operating-tower-turret', 90],
      ['protectorate/building/operating-tower', 100],
    ],
    queued: [...times(4, 'protectorate/unit/prospector'), ...times(2, 'protectorate/unit/commando'), ...times(2, 'protectorate/unit/sentinel')],
  },
  grell: {
    timed: [
      ['grell/building/nourishing-pod', 0],
      ['grell/building/broodwomb', 15],
      ['grell/building/young-canopy', 80],
      ['grell/upgrade/extensor-adaptation', 110],
    ],
    queued: [...times(4, 'grell/unit/gatherer'), ...times(4, 'grell/unit/stinger'), ...times(3, 'grell/unit/lasher')],
  },
  'the-xol': {
    timed: [
      ['the-xol/building/power-core', 0],
      ['the-xol/building/xyther-assembler', 5],
      ['the-xol/building/gyroforge', 30],
      ['the-xol/building/molten-core', 90],
    ],
    queued: [...times(2, 'the-xol/unit/xol-harvester'), ...times(3, 'the-xol/unit/xyther'), ...times(2, 'the-xol/unit/xol-harvester')],
  },
  'the-legion': {
    timed: [
      ['the-legion/building/idal-conduit', 20],
      ['the-legion/building/barracks', 35],
      ['the-legion/building/bestiary', 40],
      ['the-legion/building/citadel', 90],
      ['the-legion/upgrade/battle-frenzy', 140],
    ],
    queued: [...times(6, 'the-legion/unit/legion-labourer'), ...times(4, 'the-legion/unit/thrall'), ...times(2, 'the-legion/unit/exalted')],
  },
};

describe('Simulation of a realistic opening of each faction', () => {
  it.each(Object.entries(OPENINGS))(
    // Supply checked from 15 at start (PO3) for every faction, the Xol too since the data gives the Power Core 8 (PO5).
    'should start every order of %s within 6 minutes, never held by the supply',
    (factionId, { timed, queued }) => {
      const result = simulateReal(toBuild(factionId, null, timed, queued));

      expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
      expect(result.orders).toHaveLength(timed.length + queued.length);
      expect(result.orders.every(({ startAt, clickAt }) => startAt !== null && clickAt !== null && startAt >= clickAt)).toBe(true);
      expect(result.endTime).toBeLessThan(360);
      expect(result.supply.isChecked).toBe(true);
      expect(result.supply.cap).not.toBeNull();
      expect(result.orders.some(({ waits }) => waits.supply !== undefined)).toBe(false);
    },
  );

  it('should start every timed building at or after its click time', () => {
    const { timed, queued } = OPENINGS.protectorate;
    const result = simulateReal(toBuild('protectorate', null, timed, queued));

    timed.forEach(([, at], index) => expect(orderOf(result, `b${index + 1}`).clickAt).toBe(at));
  });
});

describe('Early click on the real data', () => {
  // Rich starting base (Mazar 2026-11-17): the Hexite of the Barracks is there at 0:15.
  const result = simulateReal(
    toBuild(
      'protectorate',
      null,
      [['protectorate/building/supply-platform', 0], ['protectorate/building/barracks', 15], ['protectorate/building/research-lab', 55]],
      ['protectorate/unit/prospector', 'protectorate/unit/sentinel'],
    ),
  );

  it('should start the Barracks at its click time', () => {
    expect(orderOf(result, 'b2')).toMatchObject({ clickAt: 15, startAt: 15, waits: {} });
  });

  it('should queue the Sentinel when the Research Lab is ready and start it when the Flux is mined', () => {
    const lab = result.lanes.find(({ id }) => id === 'lane:b3');
    const sentinel = orderOf(result, 'u2');

    expect(sentinel).toMatchObject({ laneId: 'lane:b2', clickAt: lab?.readyAt });
    expect(sentinel.waits.flux).toBeGreaterThan(0);
  });
});

describe('Resource reservation on the real data', () => {
  // The Power Core (supply class) starts at once; the harvester (unit class) then saves for 175 Hexite.
  const build = toBuild('the-xol', null, [['the-xol/building/power-core', 0], ['the-xol/building/xyther-assembler', 0]], ['the-xol/unit/xol-harvester']);

  it('should hold the Xyther Assembler behind the harvester waiting for Hexite when the reservation is strict', () => {
    const result = simulateReal(build);

    expect(orderOf(result, 'b1').startAt).toBe(0);
    expect(orderOf(result, 'b2').startAt).toBeGreaterThan(orderOf(result, 'u1').startAt ?? Infinity);
    expect(orderOf(result, 'b2').waits).toMatchObject({ requirement: 3, reserved: expect.any(Number) });
  });

  it('should start the Xyther Assembler once the Power Core is done when there is no reservation', () => {
    const context = toRealContext(build);
    const rules = { ...context.rules, reservation: { ...context.rules.reservation, value: 'none' as const } };
    const result = simulateReal(build, { ...context, rules });

    // 150 - 50 + 3 s × 448 / 60 = 122.4 Hexite at 0:03, enough for 100.
    expect(orderOf(result, 'b2').startAt).toBe(3);
    expect(orderOf(result, 'u1').startAt).toBeGreaterThan(3);
  });
});

describe('Harvester limit on the real data', () => {
  it.each([
    ['protectorate', 'protectorate/unit/prospector', 8],
    ['grell', 'grell/unit/gatherer', 8],
    ['the-xol', 'the-xol/unit/xol-harvester', 4],
    ['the-legion', 'the-legion/unit/legion-labourer', 12],
  ] as const)('should keep %s to %s ×%i when the list asks for one more', (factionId, harvesterId, max) => {
    const result = simulateReal(toBuild(factionId, null, [], times(max + 1, harvesterId)));

    expect(result.orders).toHaveLength(max);
    expect(result.steps.at(-1)?.diagnostics.map(({ code }) => code)).toEqual(['harvester-cap']);
  });
});

describe('Economy on the real data', () => {
  // Supply Platform and Barracks (75 Hexite each), then an Assembly Plant whose 50 Flux never come.
  const neverStarted = simulateReal(
    toBuild('protectorate', null, [
      ['protectorate/building/supply-platform', 0],
      ['protectorate/building/barracks', 15],
      ['protectorate/building/assembly-plant', 60],
    ]),
  );

  // The starting base is on a rich spot (Mazar 2026-11-17): 448 / min, 5,800 Hexite.
  it('should mine 448 Hexite per minute at the start, then a quarter of it when the 5,800 Hexite rich pit is empty', () => {
    expect(hexiteAt(neverStarted, 700)).toBeCloseTo(150 - 75 - 75 + (448 / 60) * 700, 2);
    expect(hexiteAt(neverStarted, 900) - hexiteAt(neverStarted, 800)).toBeCloseTo((448 / 60) * 100 * 0.25, 2);
  });

  it('should report a building that never starts when its Flux is never produced', () => {
    expect(orderOf(neverStarted, 'b3')).toMatchObject({ startAt: null, endAt: null });
    expect(neverStarted.steps[2].diagnostics.map(({ message }) => message)).toEqual([
      'Never starts: needs 50 more Flux and nothing produces it.',
    ]);
  });

  // The Molten Core never gets its Flux: the simulation runs on, the Hexite income alone changes the bank.
  it('should give a new World Engine its first worker 33.5 s after it is ready', () => {
    const result = simulateReal(
      toBuild('the-xol', null, [
        ['the-xol/building/world-engine', 1],
        ['the-xol/building/power-core', 2],
        ['the-xol/building/gyroforge', 3],
        ['the-xol/building/molten-core', 4],
      ]),
    );

    // Rich starting base: 448 / min = 74.67 every 10 s; the new World Engine mines at the normal rate, 1.4 / s a worker.
    const rich = (448 / 60) * 10;
    expect(result.lanes.find(({ id }) => id === 'lane:b1')?.readyAt).toBe(93.5);
    expect(hexiteAt(result, 130) - hexiteAt(result, 120)).toBeCloseTo(rich + 3 * 1.4, 2);
    expect(hexiteAt(result, 140) - hexiteAt(result, 130)).toBeCloseTo(rich + 14, 2);
    expect(hexiteAt(result, 180) - hexiteAt(result, 170)).toBeCloseTo(rich + 28, 2);
  });
});
