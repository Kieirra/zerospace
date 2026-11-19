import { describe, expect, it } from 'vitest';
import { toSlotMarks, toSlotMarkTitle, withSlotLegend } from './slot-marks.helpers.ts';

const gauge = (points: [number, number][], isKnown = true) => ({
  max: 4,
  isKnown,
  points: points.map(([t, count]) => ({ t, count })),
});

describe('toSlotMarks', () => {
  it('should mark the completion and every recharge, never a spent slot', () => {
    const marks = toSlotMarks(gauge([[100, 1], [100, 0], [190, 1], [200, 0], [280, 1], [370, 2]]));

    expect(marks).toEqual([
      { t: 100, count: 1, max: 4 },
      { t: 190, count: 1, max: 4 },
      { t: 280, count: 1, max: 4 },
      { t: 370, count: 2, max: 4 },
    ]);
  });

  it('should draw nothing without a mercenary building or when the stack rule is a guess', () => {
    expect(toSlotMarks(undefined)).toEqual([]);
    expect(toSlotMarks(gauge([[100, 4]], false))).toEqual([]);
  });
});

describe('toSlotMarkTitle', () => {
  it('should give the time and the slots ready', () => {
    expect(toSlotMarkTitle({ t: 190, count: 2, max: 4 }, '3:10')).toBe('Mercenary slot 3:10 · 2/4 ready');
  });
});

describe('withSlotLegend', () => {
  const mark = { t: 1, count: 1, max: 4 };

  it('should add the slot right after the mercenary diamond', () => {
    expect(withSlotLegend(['building', 'mercenary', 'hero'], [{ slotMarks: [mark] }])).toEqual([
      'building',
      'mercenary',
      'mercenary-slot',
      'hero',
    ]);
  });

  it('should add it at the end without a recruit, and not at all without a mark', () => {
    expect(withSlotLegend(['building'], [{ slotMarks: [mark] }])).toEqual(['building', 'mercenary-slot']);
    expect(withSlotLegend(['building'], [{ slotMarks: [] }])).toEqual(['building']);
  });
});
