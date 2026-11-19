import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { entity } from '../engine/engine.fixtures.ts';
import {
  ASTER,
  BARRACKS,
  BULWARK,
  CATALOG,
  GALAVAX,
  SENTINEL,
  SKIMMER,
  lane,
  order,
  result,
  stepTiming,
  viewBuild,
} from './timeline.fixtures.ts';
import {
  packRows,
  toItemAriaLabel,
  toLegendKinds,
  toPixelsPerSecond,
  toTimelineItems,
  toTimeScale,
} from './timeline.helpers.ts';
import type { Diagnostic } from '../engine/engine.types.ts';

const SETUP = { entityId: ASTER.id, at: 15, supply: 10 };
const ERROR: Diagnostic = { code: 'hero-no-slot', severity: 'error', message: 'No hero slot left.' };
const HEROES = result().heroes;
const EMPTY = viewBuild([]);
// A unit the Barracks can make, unlike the fixture Sentinel (no producer).
const TROOPER = entity('unit/trooper', { producedBy: [BARRACKS.id] });
const WITH_TROOPER = toCatalogMap([...CATALOG.values(), TROOPER]);
const NEVER = { clickAt: null, startAt: null, endAt: null };

describe('toTimeScale', () => {
  it('should keep at least 60 seconds', () => {
    expect(toTimeScale(10, 1000)).toEqual({ totalSeconds: 60, pixelsPerSecond: 1000 / 60 });
  });

  it('should round the end plus 5 seconds up to 30 seconds', () => {
    expect(toTimeScale(181, 960).totalSeconds).toBe(210);
    expect(toTimeScale(175, 960).totalSeconds).toBe(180);
  });

  it('should keep 3 minutes in the width past 3 minutes', () => {
    expect(toTimeScale(1795, 900)).toEqual({ totalSeconds: 1800, pixelsPerSecond: 5 });
  });
});

describe('toPixelsPerSecond', () => {
  it('should fit 60 seconds in the frame width', () => {
    expect(toPixelsPerSecond(1200, 60)).toBe(20);
  });

  it('should fit 180 seconds in the frame width', () => {
    expect(toPixelsPerSecond(1200, 180)).toBe(1200 / 180);
  });

  it('should keep the 180 seconds scale for 600 seconds, the frame then scrolls', () => {
    expect(toPixelsPerSecond(1200, 600)).toBe(1200 / 180);
    expect(600 * toPixelsPerSecond(1200, 600)).toBeGreaterThan(1200);
  });
});

describe('packRows', () => {
  it('should stack overlapping intervals and reuse a free row', () => {
    const intervals = [
      { start: 0, end: 30 },
      { start: 10, end: 40 },
      { start: 30, end: 50 },
      { start: 45, end: 60 },
    ];

    expect(packRows(intervals)).toEqual([0, 1, 0, 1]);
  });

  it('should keep rows in input order when the starts are unsorted', () => {
    expect(packRows([{ start: 20, end: 30 }, { start: 0, end: 25 }])).toEqual([1, 0]);
  });

  it('should keep a minimum span free for instant marks', () => {
    const marks = [
      { start: 10, end: 10 },
      { start: 10, end: 10 },
      { start: 50, end: 50 },
    ];

    expect(packRows(marks, 30)).toEqual([0, 1, 0]);
  });
});

describe('toTimelineItems', () => {
  it('should make one item per order keyed by its step uid, with its lane label and a wait label from 6 seconds', () => {
    const items = toTimelineItems(
      result({
        orders: [
          order('s1', SENTINEL, { laneId: 'lane:b1', clickAt: 95, startAt: 107, endAt: 143 }),
          order('s2', SENTINEL, { laneId: 'lane:b1', clickAt: 143, startAt: 145, endAt: 181 }),
        ],
        lanes: [lane('lane:b1', 'Barracks')],
      }),
      CATALOG,
      EMPTY,
    );

    expect(items.map(({ stepUid, where, waitLabel, isClickedEarly }) => ({ stepUid, where, waitLabel, isClickedEarly }))).toEqual([
      { stepUid: 's1', where: 'Barracks', waitLabel: '+0:12', isClickedEarly: true },
      { stepUid: 's2', where: 'Barracks', waitLabel: null, isClickedEarly: true },
    ]);
  });

  it('should not mark an order started at the second of its click', () => {
    const [item] = toTimelineItems(result({ orders: [order('s1', SENTINEL, { clickAt: 12.3, startAt: 12.4 })] }), CATALOG, EMPTY);

    expect(item.isClickedEarly).toBe(false);
    expect(item.waitLabel).toBeNull();
  });

  it('should keep an order that never starts without any wait: its never-starts mark alone (Kieirra 2026-11-19)', () => {
    const never = order('s1', SENTINEL, { clickAt: 30, startAt: null, endAt: null });
    const [item] = toTimelineItems(result({ orders: [never] }), CATALOG, EMPTY);

    expect(item).toMatchObject({ clickAt: 30, isClickedEarly: false, waitLabel: null, startAt: null });
  });

  it('should make a unit with a time wait from that time, not from its entry in the queue', () => {
    const late = order('s1', SENTINEL, { laneId: 'lane:b1', clickAt: 60, startAt: 70, endAt: 106 });
    const [item] = toTimelineItems(result({ orders: [late] }), CATALOG, { timed: [], queued: [{ uid: 's1', entityId: SENTINEL.id, at: 40 }] });

    expect(item).toMatchObject({ clickAt: 40, isClickedEarly: true, waitLabel: '+0:30' });
  });

  it('should keep an order never released, without wait label nor click mark', () => {
    const [item] = toTimelineItems(result({ orders: [order('s1', SENTINEL, NEVER)] }), CATALOG, EMPTY);

    expect(item).toMatchObject({ stepUid: 's1', clickAt: null, startAt: null, waitLabel: null, isClickedEarly: false });
  });

  it('should label a mercenary recruit with its pack size and add the setup hero last', () => {
    const items = toTimelineItems(
      result({ orders: [order('s1', SKIMMER, { startAt: 160, endAt: 160 })], heroes: { ...HEROES, setup: SETUP } }),
      CATALOG,
      EMPTY,
    );

    expect(items.map(({ shape, label, startAt, clickAt }) => ({ shape, label, startAt, clickAt }))).toEqual([
      { shape: 'mercenary', label: 'Skimmer ×2', startAt: 160, clickAt: 0 },
      { shape: 'setup-hero', label: 'Prefect Aster', startAt: 15, clickAt: null },
    ]);
  });

  it('should flag the order of a step in error', () => {
    const [item] = toTimelineItems(
      result({ orders: [order('s1', GALAVAX)], steps: [stepTiming('s1', { diagnostics: [{ ...ERROR, stepUid: 's1' }] })] }),
      CATALOG,
      EMPTY,
    );

    expect(item).toMatchObject({ shape: 'hero', hasError: true });
  });
});

describe('toTimelineItems for a unit never released', () => {
  const LANES = [
    { ...lane('lane:b1', 'Bulwark'), readyAt: 30 },
    { ...lane('lane:b2', 'Barracks #1'), readyAt: 40 },
    { ...lane('lane:b3', 'Barracks #2'), readyAt: 50 },
  ];
  const TIMED: [string, typeof BARRACKS, number][] = [['b1', BULWARK, 0], ['b2', BARRACKS, 10], ['b3', BARRACKS, 20]];
  const itemOf = (queued: [string, typeof BARRACKS, string?][], lanes = LANES) =>
    toTimelineItems(result({ orders: [order('u1', queued[0][1], NEVER)], lanes }), WITH_TROOPER, viewBuild(TIMED, queued))[0];

  it('should place it on its pinned lane, its never-starts mark from the end of that construction', () => {
    expect(itemOf([['u1', TROOPER, 'b3']])).toMatchObject({ laneId: 'lane:b3', where: 'Barracks #2', neverStartsFrom: 50 });
  });

  it('should place it in Auto on the first lane able to make it', () => {
    expect(itemOf([['u1', TROOPER]])).toMatchObject({ laneId: 'lane:b2', where: 'Barracks #1', neverStartsFrom: 40 });
  });

  it('should place it on the first lane when no lane of the build can make it', () => {
    expect(itemOf([['u1', SENTINEL]])).toMatchObject({ laneId: 'lane:b1', neverStartsFrom: 30 });
  });

  it('should leave it outside any lane, its mark from 0, when the simulation has no lane', () => {
    expect(itemOf([['u1', TROOPER, 'b3']], [])).toMatchObject({ laneId: null, where: '', neverStartsFrom: 0 });
  });
});

describe('toLegendKinds', () => {
  it('should list the kinds of the build in legend order, Hero last', () => {
    const items = toTimelineItems(
      result({ orders: [order('s1', GALAVAX, { clickAt: 160, startAt: 170 }), order('s2', BARRACKS)] }),
      CATALOG,
      EMPTY,
    );

    expect(toLegendKinds(items)).toEqual(['building', 'clicked-early', 'hero']);
  });
});

describe('toItemAriaLabel', () => {
  const [item] = toTimelineItems(
    result({
      orders: [order('s1', SENTINEL, { laneId: 'lane:b1', clickAt: 95, startAt: 107, endAt: 143 })],
      lanes: [lane('lane:b1', 'Barracks')],
    }),
    CATALOG,
    EMPTY,
  );

  it('should read the name, the lane and the three times', () => {
    expect(toItemAriaLabel(item)).toBe('Sentinel, Barracks, clicked 1:35, starts 1:47, ready 2:23');
  });
});
