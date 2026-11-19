import { describe, expect, it } from 'vitest';
import { toWheelScrollLeft } from './use-wheel-scroll.helpers.ts';

const wheel = (deltaY: number, fields: Partial<Parameters<typeof toWheelScrollLeft>[0]> = {}) => ({
  deltaX: 0,
  deltaY,
  deltaMode: 0,
  shiftKey: false,
  ctrlKey: false,
  ...fields,
});

const FRAME = { scrollLeft: 100, scrollWidth: 1000, clientWidth: 400 };

describe('toWheelScrollLeft', () => {
  it('should scroll the frame sideways by the vertical wheel, within its scroll range', () => {
    expect(toWheelScrollLeft(wheel(120), FRAME)).toBe(220);
    expect(toWheelScrollLeft(wheel(-120), FRAME)).toBe(0);
    expect(toWheelScrollLeft(wheel(900), FRAME)).toBe(600);
  });

  it('should count a wheel in lines or pages', () => {
    expect(toWheelScrollLeft(wheel(3, { deltaMode: 1 }), FRAME)).toBe(220);
    expect(toWheelScrollLeft(wheel(-1, { deltaMode: 2 }), { ...FRAME, scrollLeft: 500 })).toBe(100);
  });

  it('should leave the wheel to the page without horizontal scrollbar', () => {
    expect(toWheelScrollLeft(wheel(120), { scrollLeft: 0, scrollWidth: 400, clientWidth: 400 })).toBeNull();
  });

  it('should leave the wheel to the page when the frame is at the end it goes to', () => {
    expect(toWheelScrollLeft(wheel(-120), { ...FRAME, scrollLeft: 0 })).toBeNull();
    expect(toWheelScrollLeft(wheel(120), { ...FRAME, scrollLeft: 600 })).toBeNull();
    expect(toWheelScrollLeft(wheel(-120), { ...FRAME, scrollLeft: 600 })).toBe(480);
  });

  it('should leave a sideways scroll, Shift + wheel and Ctrl + wheel to the browser', () => {
    expect(toWheelScrollLeft(wheel(10, { deltaX: 40 }), FRAME)).toBeNull();
    expect(toWheelScrollLeft(wheel(120, { shiftKey: true }), FRAME)).toBeNull();
    expect(toWheelScrollLeft(wheel(120, { ctrlKey: true }), FRAME)).toBeNull();
  });
});
