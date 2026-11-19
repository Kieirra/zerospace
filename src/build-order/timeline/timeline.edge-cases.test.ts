import { describe, expect, it, vi } from 'vitest';
import { ASTER, CATALOG, SENTINEL, SKIMMER, lane, order, result, viewBuild } from './timeline.fixtures.ts';
import { entity } from '../engine/engine.fixtures.ts';
import { toItemButtonProps, toItemTimesLabel, toTimelineItems } from './timeline.helpers.ts';
import { toProducerLanes } from './timeline.lanes.ts';

const SCALE = { totalSeconds: 240, pixelsPerSecond: 4 };
const HEROES = result().heroes;
const UNKNOWN_HERO = entity('hero/unknown', { kind: 'hero', category: 'hero' });
const EMPTY = viewBuild([]);
const BASE_LANE = { ...lane('lane:base', 'Operating Tower'), isStarting: true };

describe('toTimelineItems with unknown entities', () => {
  it('should leave out an order whose entity is not in the catalog', () => {
    const items = toTimelineItems(result({ orders: [order('s1', entity('unit/ghost')), order('s2', SENTINEL)] }), CATALOG, EMPTY);

    expect(items.map(({ stepUid }) => stepUid)).toEqual(['s2']);
  });

  it('should leave out a setup hero missing from the catalog and its Hero lane', () => {
    const items = toTimelineItems(
      result({ orders: [order('s1', SENTINEL)], heroes: { ...HEROES, setup: { entityId: UNKNOWN_HERO.id, at: 15, supply: 10 } } }),
      CATALOG,
      EMPTY,
    );

    expect(items.map(({ shape }) => shape)).toEqual(['unit']);
    expect(toProducerLanes(items, [BASE_LANE], SCALE).map(({ id }) => id)).toEqual(['lane:base']);
  });
});

describe('toProducerLanes with orders that never start', () => {
  const items = toTimelineItems(
    result({
      lanes: [BASE_LANE],
      orders: [
        order('s1', SENTINEL, { laneId: 'lane:base', clickAt: 30, startAt: null, endAt: null }),
        order('s2', SENTINEL, { laneId: 'lane:base', clickAt: 200, startAt: 200, endAt: 236 }),
      ],
    }),
    CATALOG,
    EMPTY,
  );
  const [base] = toProducerLanes(items, [BASE_LANE], SCALE);

  it('should keep the row busy up to the right edge', () => {
    expect(base.items.map(({ row }) => row)).toEqual([0, 1]);
  });
});

describe('toProducerLanes for mercenary marks', () => {
  it('should stack two recruits closer than the room of a mark and its label', () => {
    const items = toTimelineItems(
      result({
        lanes: [BASE_LANE],
        orders: [
          order('s1', SKIMMER, { laneId: 'lane:base', clickAt: 100, startAt: 100, endAt: 100 }),
          order('s2', SKIMMER, { laneId: 'lane:base', clickAt: 110, startAt: 110, endAt: 110 }),
          order('s3', SKIMMER, { laneId: 'lane:base', clickAt: 200, startAt: 200, endAt: 200 }),
        ],
      }),
      CATALOG,
      EMPTY,
    );
    const [mercenary] = toProducerLanes(items, [BASE_LANE], SCALE);

    expect(mercenary.items.map(({ row }) => row)).toEqual([0, 1, 0]);
  });
});

describe('toItemTimesLabel', () => {
  it('should describe the setup hero without any click', () => {
    const items = toTimelineItems(result({ heroes: { ...HEROES, setup: { entityId: ASTER.id, at: 15, supply: 10 } } }), CATALOG, EMPTY);

    expect(toItemTimesLabel(items[0])).toBe('free · picked at match start, at base 0:15');
  });

  it('should say Never starts and drop Ready for an order that never starts', () => {
    const [item] = toTimelineItems(result({ orders: [order('s1', SENTINEL, { clickAt: 30, startAt: null, endAt: null })] }), CATALOG, EMPTY);

    expect(toItemTimesLabel(item)).toBe('Click 0:30 · Never starts');
  });

  it('should say Never starts alone for an order never released', () => {
    const [item] = toTimelineItems(result({ orders: [order('s1', SENTINEL, { clickAt: null, startAt: null, endAt: null })] }), CATALOG, EMPTY);

    expect(toItemTimesLabel(item)).toBe('Never starts');
  });
});

describe('toItemButtonProps', () => {
  it('should highlight on hover and focus and open the card on click', () => {
    const [item] = toTimelineItems(result({ orders: [order('s1', SENTINEL)] }), CATALOG, EMPTY);
    const events = { onEnter: vi.fn(), onLeave: vi.fn(), onOpen: vi.fn(), onToggle: vi.fn() };
    const target = { currentTarget: {} as HTMLElement };
    const props = toItemButtonProps(item, events);

    props.onMouseEnter();
    props.onFocus();
    props.onClick({ ...target, ctrlKey: false, metaKey: false, shiftKey: false });
    props.onBlur();

    expect(events.onEnter).toHaveBeenCalledTimes(2);
    expect(events.onEnter).toHaveBeenCalledWith(item);
    expect(events.onOpen).toHaveBeenCalledWith(item, target.currentTarget);
    expect(events.onToggle).not.toHaveBeenCalled();
    expect(events.onLeave).toHaveBeenCalledTimes(1);
    expect(props['data-step-uid']).toBe('s1');
  });

  it('should toggle the step on Ctrl, Cmd or Shift + click, without opening it', () => {
    const [item] = toTimelineItems(result({ orders: [order('s1', SENTINEL)] }), CATALOG, EMPTY);
    const events = { onEnter: vi.fn(), onLeave: vi.fn(), onOpen: vi.fn(), onToggle: vi.fn() };
    const props = toItemButtonProps(item, events);
    const click = { currentTarget: {} as HTMLElement, ctrlKey: false, metaKey: false, shiftKey: false };

    props.onClick({ ...click, ctrlKey: true });
    props.onClick({ ...click, metaKey: true });
    props.onClick({ ...click, shiftKey: true });

    expect(events.onToggle).toHaveBeenCalledTimes(3);
    expect(events.onToggle).toHaveBeenCalledWith(item);
    expect(events.onOpen).not.toHaveBeenCalled();
  });
});
