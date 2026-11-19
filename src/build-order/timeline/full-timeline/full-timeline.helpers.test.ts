import { describe, expect, it } from 'vitest';
import { BARRACKS, BULWARK, CATALOG, ROUNDS, SENTINEL, SKIMMER, lane, order, result, viewBuild } from '../timeline.fixtures.ts';
import { toTimelineItems } from '../timeline.helpers.ts';
import { toProducerLanes } from '../timeline.lanes.ts';
import { toFullLanes, toFullLegendKinds, toResourceTracks } from './full-timeline.helpers.ts';
import type { Lane, ResourceSample, SimulationResult } from '../../engine/engine.types.ts';

const SCALE = { totalSeconds: 240, pixelsPerSecond: 4 };

const fullLanes = (fields: Partial<SimulationResult>) => {
  const simulated = result(fields);
  return toFullLanes(toProducerLanes(toTimelineItems(simulated, CATALOG, viewBuild([])), simulated.lanes, SCALE), simulated.lanes);
};

const sample = (t: number, fields: Partial<ResourceSample> = {}): ResourceSample => ({
  t,
  hexite: 0,
  flux: 0,
  supplyUsed: 0,
  supplyCap: null,
  ...fields,
});

const BARRACKS_LANE: Lane = { ...lane('lane:b1', 'Barracks'), startAt: 12, readyAt: 47 };

describe('toFullLanes', () => {
  it('should keep one lane per building instance: Barracks and Barracks #2', () => {
    const lanes = fullLanes({
      lanes: [BARRACKS_LANE, { ...lane('lane:b2', 'Barracks #2'), startAt: 30, readyAt: 65 }],
      orders: [
        order('s1', BARRACKS, { laneId: 'lane:b1', clickAt: 12, startAt: 12, endAt: 47 }),
        order('s2', BARRACKS, { laneId: 'lane:b2', clickAt: 30, startAt: 30, endAt: 65 }),
        order('s3', SENTINEL, { laneId: 'lane:b1', clickAt: 61, startAt: 61, endAt: 97 }),
        order('s4', SENTINEL, { laneId: 'lane:b2', clickAt: 70, startAt: 70, endAt: 106 }),
      ],
    });

    expect(lanes.map(({ label, items }) => [label, items.map((item) => item.label)])).toEqual([
      ['Barracks', ['Barracks', 'Sentinel']],
      ['Barracks #2', ['Barracks', 'Sentinel']],
    ]);
  });

  it('should label an idle gap of 6 s or more, and hatch a shorter one without label', () => {
    const [barracks] = fullLanes({
      lanes: [{ ...BARRACKS_LANE, idle: [{ from: 47, to: 61 }, { from: 97, to: 100 }] }],
      orders: [order('s1', BARRACKS, { laneId: 'lane:b1', clickAt: 12, startAt: 12, endAt: 47 })],
    });

    expect(barracks.idle).toEqual([
      { from: 47, to: 61, label: 'idle 0:14' },
      { from: 97, to: 100, label: null },
    ]);
  });

  it('should put the ready mark at the end of construction, none on the starting base', () => {
    const lanes = fullLanes({
      lanes: [{ ...lane('lane:base', 'Operating Tower'), isStarting: true }, BARRACKS_LANE],
      orders: [
        order('s1', SENTINEL, { laneId: 'lane:base', clickAt: 0, startAt: 0, endAt: 18 }),
        order('s2', BARRACKS, { laneId: 'lane:b1', clickAt: 12, startAt: 12, endAt: 47 }),
      ],
    });

    expect(lanes.map(({ readyAt }) => readyAt)).toEqual([null, 47]);
  });

  it('should count the time orders waited in the queue after their click, overlaps once', () => {
    const [barracks] = fullLanes({
      lanes: [BARRACKS_LANE],
      orders: [
        order('s1', BARRACKS, { laneId: 'lane:b1', clickAt: 0, startAt: 12, endAt: 47 }),
        order('s2', SENTINEL, { laneId: 'lane:b1', clickAt: 95, startAt: 107, endAt: 143 }),
        order('s3', SENTINEL, { laneId: 'lane:b1', clickAt: 100, startAt: 105, endAt: 141 }),
        order('s4', SENTINEL, { laneId: 'lane:b1', clickAt: 143, startAt: 145, endAt: 181 }),
      ],
    });

    expect(barracks.rightLabel).toEqual({ text: 'queued 0:14', tone: 'click' });
  });

  it('should leave the right label empty when nothing waited', () => {
    const [barracks] = fullLanes({
      lanes: [BARRACKS_LANE],
      orders: [order('s1', BARRACKS, { laneId: 'lane:b1', clickAt: 12, startAt: 12, endAt: 47 })],
    });

    expect(barracks.rightLabel).toBeNull();
  });

  it('should show stacks ?/4 on a mercenary building without recruit when the stack rule is unknown', () => {
    const [bulwark] = fullLanes({
      lanes: [{ ...lane('lane:b1', 'Marran Bulwark'), entityId: BULWARK.id, stacks: { max: 4, isKnown: false, points: [] } }],
      orders: [order('s1', BULWARK, { laneId: 'lane:b1', clickAt: 47, startAt: 47, endAt: 97 })],
    });

    expect(bulwark.rightLabel).toEqual({ text: 'stacks ?/4', tone: 'warn' });
    expect(bulwark.items.map(({ shape }) => shape)).toEqual(['building']);
  });

  it('should show the stacks left after the last recruit when the stack rule is known', () => {
    const [bulwark] = fullLanes({
      lanes: [
        {
          ...lane('lane:b1', 'Marran Bulwark'),
          stacks: { max: 4, isKnown: true, points: [{ t: 97, count: 4 }, { t: 120, count: 3 }] },
        },
      ],
      orders: [
        order('s1', BULWARK, { laneId: 'lane:b1', clickAt: 47, startAt: 47, endAt: 97 }),
        order('s2', SKIMMER, { laneId: 'lane:b1', clickAt: 120, startAt: 120, endAt: 120 }),
      ],
    });

    expect(bulwark.rightLabel).toEqual({ text: 'stacks 3/4', tone: 'muted' });
  });

  it('should put an order outside any lane on the starting base, without decoration', () => {
    const [base] = fullLanes({
      lanes: [{ ...lane('lane:base', 'Operating Tower'), isStarting: true }],
      orders: [order('s1', ROUNDS, { clickAt: 100, startAt: 100, endAt: 145 })],
    });

    expect(base).toMatchObject({ label: 'Operating Tower', readyAt: null, idle: [], rightLabel: null });
    expect(base.items.map(({ stepUid }) => stepUid)).toEqual(['s1']);
  });
});

describe('toResourceTracks', () => {
  const samples = [
    sample(0, { hexite: 300, supplyUsed: 0 }),
    sample(1, { hexite: 685, flux: 20, supplyUsed: 2 }),
    sample(2, { hexite: 100, flux: 147, supplyUsed: 2 }),
  ];

  it('should give the peak of each bank and a scale of at least 100', () => {
    const tracks = toResourceTracks(result({ samples, endTime: 2 }), 60);

    expect([tracks.hexite.label, tracks.hexite.max, tracks.flux.label, tracks.flux.max]).toEqual([
      'peak 685',
      685,
      'peak 147',
      147,
    ]);
    expect(toResourceTracks(result({ samples: [sample(0, { hexite: 40 }), sample(1)] }), 60).hexite.max).toBe(100);
  });

  it('should hide the supply when it is not checked', () => {
    const tracks = toResourceTracks(result({ samples, supply: { used: 2, cap: null, isChecked: false } }), 60);

    expect(tracks.supply).toBeNull();
  });

  it('should draw the free supply as stairs, never below 0, when the supply is checked (Kieirra 2026-11-19)', () => {
    const capped = [...samples.map((point) => ({ ...point, supplyCap: 20 })), sample(3, { supplyUsed: 24, supplyCap: 20 })];
    const tracks = toResourceTracks(result({ samples: capped, supply: { used: 24, cap: 20, isChecked: true } }), 60);

    expect(tracks.supply?.points).toEqual([
      { t: 0, value: 20 },
      { t: 1, value: 20 },
      { t: 1, value: 18 },
      { t: 2, value: 18 },
      { t: 3, value: 18 },
      { t: 3, value: 0 },
    ]);
    expect(tracks.supply?.label).toBe('0 free');
  });

  it('should name the free supply of the last sample', () => {
    const capped = samples.map((point) => ({ ...point, supplyCap: 20 }));

    expect(toResourceTracks(result({ samples: capped, supply: { used: 2, cap: 20, isChecked: true } }), 60).supply?.label).toBe('18 free');
  });

  it('should hold a flat line to the end of the axis for an empty build', () => {
    const tracks = toResourceTracks(result(), 60);

    expect(tracks.hexite.points).toEqual([
      { t: 0, value: 0 },
      { t: 60, value: 0 },
    ]);
  });
});

describe('toFullLegendKinds', () => {
  it('should add idle before the hero, which stays last', () => {
    const lanes = fullLanes({
      lanes: [{ ...BARRACKS_LANE, idle: [{ from: 47, to: 61 }] }],
      orders: [order('s1', BARRACKS, { laneId: 'lane:b1', clickAt: 12, startAt: 12, endAt: 47 })],
    });

    expect(toFullLegendKinds(['building', 'unit', 'hero'], lanes)).toEqual(['building', 'unit', 'idle', 'hero']);
    expect(toFullLegendKinds(['building'], [])).toEqual(['building']);
  });
});
