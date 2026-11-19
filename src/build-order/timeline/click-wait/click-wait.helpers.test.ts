import { describe, expect, it } from 'vitest';
import { CATALOG, SENTINEL, order, result, viewBuild } from '../timeline.fixtures.ts';
import { toTimelineItems } from '../timeline.helpers.ts';
import { CLICK_MARK_REACH_PX, toClickMarkAt, toContentInset } from './click-wait.helpers.ts';

const SCALE = { totalSeconds: 240, pixelsPerSecond: 4 };

const [early, never, onTime, unreleased] = toTimelineItems(
  result({
    orders: [
      order('s1', SENTINEL, { laneId: 'lane:b1', clickAt: 40, startAt: 41, endAt: 77 }),
      order('s2', SENTINEL, { laneId: 'lane:b1', clickAt: 50, startAt: null, endAt: null }),
      order('s3', SENTINEL, { laneId: 'lane:b2', clickAt: 60, startAt: 60, endAt: 96 }),
      order('s4', SENTINEL, { clickAt: null, startAt: null, endAt: null }),
    ],
  }),
  CATALOG,
  viewBuild([]),
);

describe('Click mark on a lane', () => {
  it('should draw the mark at the click of an order clicked early, never for one started on time or never released', () => {
    expect([early, onTime, unreleased].map(toClickMarkAt)).toEqual([40, null, null]);
  });

  it('should draw no wait for an order that never starts: its never-starts mark alone (Kieirra 2026-11-19)', () => {
    expect(toClickMarkAt(never)).toBeNull();
  });

  it('should reserve the room of the pointer right of the click time', () => {
    expect(CLICK_MARK_REACH_PX).toBeGreaterThan(0);
  });

  it('should push the bar content after the mark when the bar starts under it', () => {
    expect(toContentInset(early, 40, SCALE)).toBeCloseTo(CLICK_MARK_REACH_PX - 4);
  });

  it('should not push the bar content when the bar starts far from the mark, has no mark or never starts', () => {
    expect(toContentInset({ ...early, startAt: 60 }, 40, SCALE)).toBe(0);
    expect(toContentInset(onTime, null, SCALE)).toBe(0);
    expect(toContentInset(never, 50, SCALE)).toBe(0);
  });
});
