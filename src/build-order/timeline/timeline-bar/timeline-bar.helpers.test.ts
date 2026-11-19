import { describe, expect, it } from 'vitest';
import { MIN_CHIP_PX } from '../timeline.constants.ts';
import { toBarWidthPx } from './timeline-bar.helpers.ts';

describe('toBarWidthPx', () => {
  it('should draw a bar as long as its time, 2 px short for a unit', () => {
    expect(toBarWidthPx(30, false, 0, 4)).toBe(120);
    expect(toBarWidthPx(30, true, 0, 4)).toBe(118);
  });

  it('should keep one chip at least for a short or instant step, past the click mark on its start', () => {
    expect(toBarWidthPx(0, false, 0, 4)).toBe(MIN_CHIP_PX);
    expect(toBarWidthPx(5, true, 0, 4)).toBe(MIN_CHIP_PX);
    expect(toBarWidthPx(5, false, 12, 4)).toBe(MIN_CHIP_PX + 12);
  });
});
