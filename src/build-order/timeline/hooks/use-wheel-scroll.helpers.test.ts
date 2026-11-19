import { describe, expect, it } from 'vitest';
import { toShiftWheelScrollLeft } from './use-wheel-scroll.helpers.ts';

const wheel = (deltaY: number, fields: Partial<Parameters<typeof toShiftWheelScrollLeft>[0]> = {}) => ({
  deltaX: 0,
  deltaY,
  deltaMode: 0,
  shiftKey: true,
  ctrlKey: false,
  ...fields,
});

const FRAME = { scrollLeft: 100, scrollWidth: 1000, clientWidth: 400 };

describe('toShiftWheelScrollLeft', () => {
  it('should scroll the frame sideways by Shift + wheel, within its scroll range', () => {
    expect(toShiftWheelScrollLeft(wheel(120), FRAME)).toBe(220);
    expect(toShiftWheelScrollLeft(wheel(-120), FRAME)).toBe(0);
    expect(toShiftWheelScrollLeft(wheel(900), FRAME)).toBe(600);
  });

  it('should read Shift + wheel given as a sideways turn', () => {
    expect(toShiftWheelScrollLeft(wheel(0, { deltaX: 120 }), FRAME)).toBe(220);
  });

  it('should count a wheel in lines or pages', () => {
    expect(toShiftWheelScrollLeft(wheel(3, { deltaMode: 1 }), FRAME)).toBe(220);
    expect(toShiftWheelScrollLeft(wheel(-1, { deltaMode: 2 }), { ...FRAME, scrollLeft: 500 })).toBe(100);
  });

  it('should leave the wheel and the trackpad without Shift, and Ctrl + wheel, to the browser', () => {
    expect(toShiftWheelScrollLeft(wheel(120, { shiftKey: false }), FRAME)).toBeNull();
    expect(toShiftWheelScrollLeft(wheel(10, { shiftKey: false, deltaX: 40 }), FRAME)).toBeNull();
    expect(toShiftWheelScrollLeft(wheel(120, { ctrlKey: true }), FRAME)).toBeNull();
  });

  it('should leave the wheel to the browser without horizontal scrollbar or at the end it goes to', () => {
    expect(toShiftWheelScrollLeft(wheel(120), { scrollLeft: 0, scrollWidth: 400, clientWidth: 400 })).toBeNull();
    expect(toShiftWheelScrollLeft(wheel(-120), { ...FRAME, scrollLeft: 0 })).toBeNull();
    expect(toShiftWheelScrollLeft(wheel(120), { ...FRAME, scrollLeft: 600 })).toBeNull();
  });
});
