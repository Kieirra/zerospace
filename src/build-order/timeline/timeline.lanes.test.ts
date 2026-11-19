import { describe, expect, it } from 'vitest';
import { ASTER, BARRACKS, CATALOG, ROUNDS, SENTINEL, lane, order, result, viewBuild } from './timeline.fixtures.ts';
import { toTimelineItems } from './timeline.helpers.ts';
import { toProducerLanes } from './timeline.lanes.ts';
import type { SimulationResult } from '../engine/engine.types.ts';

const SCALE = { totalSeconds: 240, pixelsPerSecond: 4 };
const SETUP = { entityId: ASTER.id, at: 15, supply: 10 };
const EMPTY = viewBuild([]);

const LANES = [
  { ...lane('lane:base', 'Operating Tower'), isStarting: true },
  { ...lane('lane:b1', 'Barracks'), readyAt: 52 },
  { ...lane('lane:b2', 'Barracks #2'), readyAt: 90 },
];

const ORDERS = [
  order('u1', SENTINEL, { laneId: 'lane:base', clickAt: 0, startAt: 0, endAt: 20 }),
  order('b1', BARRACKS, { laneId: 'lane:b1', clickAt: 17, startAt: 17, endAt: 52 }),
  order('u2', SENTINEL, { laneId: 'lane:b1', clickAt: 40, startAt: 52, endAt: 88 }),
  order('b2', BARRACKS, { laneId: 'lane:b2', clickAt: 60, startAt: 60, endAt: 90 }),
  order('u3', SENTINEL, { laneId: 'lane:b1', clickAt: 88, startAt: 88, endAt: 124 }),
  order('r1', ROUNDS, { laneId: null, clickAt: 100, startAt: 100, endAt: 145 }),
];

const toLanes = (fields: Partial<SimulationResult>) => {
  const simulated = result({ lanes: LANES, ...fields });
  return toProducerLanes(toTimelineItems(simulated, CATALOG, EMPTY), simulated.lanes, SCALE);
};

const lanes = toLanes({ orders: ORDERS, heroes: { ...result().heroes, setup: SETUP } });

describe('toProducerLanes', () => {
  it('should give one lane per building instance, in the order they begin', () => {
    expect(lanes.map(({ id }) => id)).toEqual(['lane:base', 'setup-hero', 'lane:b1', 'lane:b2']);
  });

  it('should put a building and what it produces on the same lane', () => {
    expect(lanes[2].items.map(({ stepUid }) => stepUid)).toEqual(['b1', 'u2', 'u3']);
  });

  it('should open a second row only for an order clicked while the lane is busy', () => {
    expect(lanes[2].items.map(({ row }) => row)).toEqual([0, 1, 0]);
    expect(lanes[2].rowCount).toBe(2);
  });

  it('should label each lane with its building and when it is ready', () => {
    expect(lanes.map(({ label, summary }) => [label, summary])).toEqual([
      ['Operating Tower', 'starting base'],
      ['Hero', 'picked at start'],
      ['Barracks', 'ready 0:52'],
      ['Barracks #2', 'ready 1:30'],
    ]);
  });

  it('should put an order outside any lane on the first lane, without a No building lane', () => {
    expect(lanes[0].items.map(({ stepUid }) => stepUid)).toEqual(['u1', 'r1']);
    expect(lanes.map(({ label }) => label)).not.toContain('No building');
  });
});

describe('toProducerLanes with a building clicked early', () => {
  it('should place the setup hero before a building clicked earlier but started after it', () => {
    const early = [order('b1', BARRACKS, { laneId: 'lane:b1', clickAt: 12, startAt: 40, endAt: 75 })];

    expect(toLanes({ orders: early, heroes: { ...result().heroes, setup: SETUP } }).map(({ id }) => id)).toEqual([
      'lane:base',
      'setup-hero',
      'lane:b1',
    ]);
  });
});

describe('toProducerLanes with the starting base', () => {
  it('should always open with the starting base, even when nothing is made there', () => {
    const [first] = toLanes({ orders: [order('b1', BARRACKS, { laneId: 'lane:b1', clickAt: 0, startAt: 0, endAt: 35 })] });

    expect([first.id, first.label, first.summary, first.items]).toEqual(['lane:base', 'Operating Tower', 'starting base', []]);
  });

  it('should keep what the starting base makes on one row when the orders do not overlap', () => {
    expect([lanes[0].items.map(({ row }) => row), lanes[0].rowCount]).toEqual([[0, 0], 1]);
  });
});

describe('toProducerLanes with units released one after another', () => {
  it('should put the steps of a unit released when the lane frees up on one row of their building', () => {
    const steps = ['u1', 'u2', 'u3'].map((uid, index) =>
      order(uid, SENTINEL, { laneId: 'lane:base', clickAt: 44 + index * 20, startAt: 44 + index * 20, endAt: 64 + index * 20 }),
    );
    const [base] = toLanes({ orders: steps });

    expect([base.items.map(({ row }) => row), base.rowCount]).toEqual([[0, 0, 0], 1]);
  });
});

describe('toProducerLanes with a unit never released', () => {
  it('should keep the row busy from the end of construction of its lane to the right edge', () => {
    const items = toTimelineItems(
      result({
        lanes: LANES,
        orders: [
          order('u1', SENTINEL, { laneId: null, clickAt: null, startAt: null, endAt: null }),
          order('u2', SENTINEL, { laneId: 'lane:b2', clickAt: 100, startAt: 100, endAt: 136 }),
        ],
      }),
      CATALOG,
      viewBuild([['b1', BARRACKS, 17], ['b2', BARRACKS, 60]], [['u1', SENTINEL, 'b2']]),
    );
    const barracks = toProducerLanes(items, LANES, SCALE).find(({ id }) => id === 'lane:b2');

    expect(barracks?.items.map(({ stepUid, neverStartsFrom, row }) => [stepUid, neverStartsFrom, row])).toEqual([
      ['u1', 90, 0],
      ['u2', 90, 1],
    ]);
  });
});
