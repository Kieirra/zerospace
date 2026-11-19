import { describe, expect, it, vi } from 'vitest';
import { BARRACKS, CATALOG, SENTINEL, order, result } from './timeline.fixtures.ts';
import { toItemButtonProps, toTimelineItems } from './timeline.helpers.ts';
import type { Build } from '../build-order.types.ts';

// A Sentinel in a loop on the Barracks, from 0:30, made again at 1:06.
const BUILD: Pick<Build, 'timed' | 'queued'> = {
  timed: [{ uid: 's1', entityId: BARRACKS.id, at: 0 }],
  queued: [{ uid: 's2', entityId: SENTINEL.id, producerUid: 's1', at: 30, repeat: true }],
};
const ORDERS = [
  order('s2', SENTINEL, { laneId: 'lane:s1', clickAt: 30, startAt: 30, endAt: 66 }),
  order('s2', SENTINEL, { occurrence: 1, laneId: 'lane:s1', clickAt: 66, startAt: 70, endAt: 106 }),
];

describe('toTimelineItems for a loop', () => {
  const items = toTimelineItems(result({ orders: ORDERS }), CATALOG, BUILD);

  it('should name the step « ∞ Sentinel » and its copies « Sentinel », each from its own click', () => {
    expect(items.map(({ stepUid, occurrence, label, clickAt, hasClickTime }) => [stepUid, occurrence, label, clickAt, hasClickTime])).toEqual([
      ['s2', 0, '∞ Sentinel', 30, true],
      ['s2', 1, 'Sentinel', 66, false],
    ]);
  });

  it('should give a copy the step uid, so that a click selects the step, and mark it as never dragged', () => {
    const events = { onEnter: vi.fn(), onLeave: vi.fn(), onOpen: vi.fn(), onToggle: vi.fn() };
    const [step, copy] = items.map((item) => toItemButtonProps(item, events));

    expect([step['data-step-uid'], copy['data-step-uid']]).toEqual(['s2', 's2']);
    expect([step['data-copy'], copy['data-copy']]).toEqual([undefined, true]);
  });
});
