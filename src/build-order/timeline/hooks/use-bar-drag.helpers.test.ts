import { describe, expect, it } from 'vitest';
import { LABEL_COLUMN_PX } from '../timeline.constants.ts';
import { toDragDelta, toDragGhost, toEdgeScroll, toPointerTime } from './use-bar-drag.helpers.ts';

const SCALE = { totalSeconds: 600, pixelsPerSecond: 2 };

describe('toPointerTime', () => {
  it('should give the time under the pointer', () => {
    expect(toPointerTime(100 + LABEL_COLUMN_PX + 60, 100, SCALE)).toBe(30);
  });

  it('should stay between 0 and the end of the timeline', () => {
    expect(toPointerTime(0, 100, SCALE)).toBe(0);
    expect(toPointerTime(10_000, 100, SCALE)).toBe(600);
  });
});

describe('toDragDelta', () => {
  // A 40 px mark from x = 300 on screen: grabbed at its center or on its left edge (Kieirra 2026-11-19).
  const CENTER = 320;
  const LEFT_EDGE = 300;

  it('should move by the same whole seconds when the mark is grabbed at its center or on its edge', () => {
    const fromCenter = toDragDelta({ x: CENTER, scrollLeft: 0 }, { x: CENTER + 61, scrollLeft: 0 }, SCALE.pixelsPerSecond);
    const fromEdge = toDragDelta({ x: LEFT_EDGE, scrollLeft: 0 }, { x: LEFT_EDGE + 61, scrollLeft: 0 }, SCALE.pixelsPerSecond);

    expect(fromCenter).toBe(31);
    expect(fromEdge).toBe(31);
  });

  it('should add the scroll of the frame since the press, wherever the mark was grabbed', () => {
    const fromCenter = toDragDelta({ x: CENTER, scrollLeft: 40 }, { x: CENTER + 20, scrollLeft: 140 }, SCALE.pixelsPerSecond);
    const fromEdge = toDragDelta({ x: LEFT_EDGE, scrollLeft: 40 }, { x: LEFT_EDGE + 20, scrollLeft: 140 }, SCALE.pixelsPerSecond);

    expect(fromCenter).toBe(60);
    expect(fromEdge).toBe(60);
  });

  it('should move back when the pointer goes left', () => {
    expect(toDragDelta({ x: CENTER, scrollLeft: 0 }, { x: CENTER - 30, scrollLeft: 0 }, SCALE.pixelsPerSecond)).toBe(-15);
  });
});

describe('toDragGhost', () => {
  it('should follow the pointer on the lane of the mark', () => {
    const mark = { left: 300, top: 250, width: 40, height: 20 };

    expect(toDragGhost(330, 10, { left: 100, top: 200 }, mark, 'Barracks')).toEqual({
      left: 220,
      top: 50,
      width: 40,
      height: 20,
      label: 'Barracks',
    });
  });
});

describe('toEdgeScroll', () => {
  const frame = { left: 0, right: 1000 };

  it('should scroll left near the label column, right near the right edge, not in between', () => {
    expect(toEdgeScroll(LABEL_COLUMN_PX + 10, frame)).toBeLessThan(0);
    expect(toEdgeScroll(990, frame)).toBeGreaterThan(0);
    expect(toEdgeScroll(500, frame)).toBe(0);
  });
});
