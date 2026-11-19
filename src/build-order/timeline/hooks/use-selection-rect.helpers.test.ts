import { describe, expect, it } from 'vitest';
import { intersects, isOnLabelColumn, isPastThreshold, toContentPoint, toHitUids, toSelectionBox } from './use-selection-rect.helpers.ts';

const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

describe('Selection rectangle: geometry', () => {
  it('should draw the rectangle whichever way the pointer goes', () => {
    expect(toSelectionBox({ x: 10, y: 20 }, { x: 50, y: 70 })).toEqual(box(10, 20, 40, 50));
    expect(toSelectionBox({ x: 50, y: 70 }, { x: 10, y: 20 })).toEqual(box(10, 20, 40, 50));
  });

  it('should count in the content of the lanes zone, the scroll of the frame included', () => {
    const start = toContentPoint({ x: 300, y: 200 }, { left: 0, top: 100 });
    // The frame scrolled 100 px: the zone moved left, the pointer stayed.
    const end = toContentPoint({ x: 300, y: 260 }, { left: -100, top: 100 });

    expect(toSelectionBox(start, end)).toEqual(box(300, 100, 100, 60));
  });

  it('should take a press moved less than 4 px for a click', () => {
    expect(isPastThreshold({ x: 0, y: 0 }, { x: 3, y: -3 })).toBe(false);
    expect(isPastThreshold({ x: 0, y: 0 }, { x: 4, y: 0 })).toBe(true);
    expect(isPastThreshold({ x: 0, y: 0 }, { x: 0, y: -4 })).toBe(true);
  });
});

describe('Selection rectangle: hits', () => {
  it('should hit the boxes sharing some room, not the ones only touching', () => {
    const rect = box(100, 100, 50, 50);

    expect(intersects(rect, box(140, 140, 30, 30))).toBe(true);
    expect(intersects(rect, box(110, 110, 5, 5))).toBe(true);
    expect(intersects(rect, box(150, 100, 20, 20))).toBe(false);
    expect(intersects(rect, box(0, 0, 100, 100))).toBe(false);
  });

  it('should give each step under the rectangle once', () => {
    const marks = [
      { uid: 's1', box: box(0, 0, 40, 20) },
      { uid: 's2', box: box(60, 0, 40, 20) },
      { uid: 's1', box: box(30, 30, 10, 20) },
      { uid: 's3', box: box(200, 0, 40, 20) },
    ];

    expect(toHitUids(box(10, 5, 60, 40), marks)).toEqual(['s1', 's2']);
  });
});

describe('Selection rectangle: where it starts', () => {
  it('should leave the lane names column alone, from the left of the frame', () => {
    expect(isOnLabelColumn(219, 100)).toBe(true);
    expect(isOnLabelColumn(220, 100)).toBe(false);
  });

  it('should start anywhere right of the lane names, curves and axis included', () => {
    expect(isOnLabelColumn(900, 100)).toBe(false);
  });
});
