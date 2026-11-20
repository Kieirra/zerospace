import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { entity } from '../engine/engine.fixtures.ts';
import { BARRACKS, SENTINEL, lane, order, result, stepTiming, viewBuild } from './timeline.fixtures.ts';
import { toItemAriaLabel, toLegendKinds, toTimelineItems } from './timeline.helpers.ts';
import { toProducerLanes } from './timeline.lanes.ts';
import { toMiscEndTime } from './timeline.misc.ts';

const SCALE = { totalSeconds: 240, pixelsPerSecond: 4 };
const UNENDING_ARMY = entity('talent/unending-army', { kind: 'talent', category: 'talent', level: 6 });
const GUARDS = entity('event/tower-xp-creeps', { kind: 'event', category: 'event', displayName: 'Tower XP creeps' });
const COMMANDO = entity('unit/commando', { displayName: 'Commando' });
const REINFORCEMENTS = entity('event/reinforcements', { kind: 'event', category: 'event', displayName: 'Reinforcements · 6 Commando' });
const CATALOG = toCatalogMap([BARRACKS, SENTINEL, UNENDING_ARMY, GUARDS, COMMANDO, REINFORCEMENTS]);
const LANES = [{ ...lane('lane:base', 'Operating Tower'), isStarting: true }, lane('lane:b1', 'Barracks')];
const BUILD = viewBuild([
  ['b1', BARRACKS, 5],
  ['m1', UNENDING_ARMY, 60],
  ['m2', GUARDS, 90],
]);
const MISC = 'lane:misc';

const toView = () => {
  const simulated = result({
    lanes: LANES,
    orders: [
      order('b1', BARRACKS, { laneId: 'lane:b1', clickAt: 5, startAt: 5, endAt: 35 }),
      order('m1', UNENDING_ARMY, { laneId: MISC, clickAt: 60, startAt: 60, endAt: 60 }),
      order('m1', SENTINEL, { laneId: MISC, occurrence: 1, clickAt: 100, startAt: 100, endAt: 100 }),
      order('m2', GUARDS, { laneId: MISC, clickAt: 90, startAt: null, endAt: null }),
    ],
  });
  const items = toTimelineItems(simulated, CATALOG, BUILD);
  return { items, lanes: toProducerLanes(items, simulated.lanes, SCALE) };
};

describe('Timeline: Misc lane (US-008)', () => {
  it('should put the Misc lane right under the starting base when the build holds a Misc step', () => {
    const { lanes } = toView();

    expect(lanes.map(({ id, label, summary }) => [id, label, summary])).toEqual([
      ['lane:base', 'Operating Tower', 'starting base'],
      [MISC, 'Misc', ''],
      ['lane:b1', 'Barracks', 'ready 0:00'],
    ]);
  });

  it('should draw the steps and their free units as Misc marks, with the Misc legend', () => {
    const { items } = toView();
    const misc = items.filter(({ laneId }) => laneId === MISC);

    expect(misc.map(({ shape, occurrence }) => [shape, occurrence])).toEqual([
      ['misc', 0],
      ['misc', 1],
      ['misc', 0],
    ]);
    expect(toLegendKinds(items)).toEqual(['building', 'misc']);
  });

  it('should name the step of a free unit and when a step applies in their labels', () => {
    const [, applied, freeUnit, never] = toView().items;

    expect(toItemAriaLabel(applied)).toBe('Unending Army, applied at 1:00');
    expect(toItemAriaLabel(freeUnit)).toBe('Sentinel, from Unending Army, 1:40');
    expect(toItemAriaLabel(never)).toBe('Tower XP creeps, never applies');
  });
});

describe('Timeline: free units made at once (US-008)', () => {
  // Reinforcements clicked at 0:02, held by the supply until 0:32: its 6 Commando all come at 0:32.
  const toReinforcementsView = () => {
    const simulated = result({
      lanes: LANES,
      orders: [
        order('r1', REINFORCEMENTS, { laneId: MISC, clickAt: 2, startAt: 32, endAt: 32 }),
        ...Array.from({ length: 6 }, (_, index) =>
          order('r1', COMMANDO, { laneId: MISC, occurrence: index + 1, clickAt: 32, startAt: 32, endAt: 32 }),
        ),
        order('r1', COMMANDO, { laneId: MISC, occurrence: 7, clickAt: 50, startAt: 50, endAt: 50 }),
      ],
    });
    const items = toTimelineItems(simulated, CATALOG, viewBuild([['r1', REINFORCEMENTS, 2]]));
    return { items, misc: toProducerLanes(items, simulated.lanes, SCALE).find(({ id }) => id === MISC) };
  };

  it('should show the free units of a step made at the same time as one point with their count', () => {
    const { items } = toReinforcementsView();
    const points = items.filter(({ occurrence }) => occurrence > 0);

    expect(points.map(({ count, startAt }) => [count, startAt])).toEqual([
      [6, 32],
      [1, 50],
    ]);
    expect(points.map(toItemAriaLabel)).toEqual([
      '6 Commando, from Reinforcements · 6 Commando, 0:32',
      'Commando, from Reinforcements · 6 Commando, 0:50',
    ]);
  });

  it('should keep the whole label of a step free of points, even after its wait', () => {
    const { misc } = toReinforcementsView();
    const step = misc?.items.find(({ occurrence }) => occurrence === 0);

    expect(misc?.items.filter(({ row, occurrence }) => occurrence > 0 && row === step?.row)).toEqual([]);
  });

  it('should keep a talent already in the build on the Misc lane at its time, in error', () => {
    const simulated = result({
      lanes: LANES,
      orders: [order('m1', UNENDING_ARMY, { laneId: MISC, clickAt: 60, startAt: null, endAt: null })],
      steps: [stepTiming('m1', { diagnostics: [{ code: 'duplicate-talent', severity: 'error', message: 'Already in the build.', stepUid: 'm1' }] })],
    });
    const [item] = toTimelineItems(simulated, CATALOG, viewBuild([['m1', UNENDING_ARMY, 60]]));

    expect(item).toMatchObject({ shape: 'misc', laneId: MISC, clickAt: 60, startAt: null, hasError: true });
  });

  it('should stretch the axis past the last point so that its icon and count are never cut', () => {
    const { items } = toReinforcementsView();
    const trackWidth = 900;

    expect(toMiscEndTime(items, trackWidth)).toBeCloseTo(32 + (136 * 180) / trackWidth);
    expect(toMiscEndTime(items.filter(({ occurrence }) => occurrence > 0), trackWidth)).toBeCloseTo(50 + (24 * 180) / trackWidth);
  });
});
