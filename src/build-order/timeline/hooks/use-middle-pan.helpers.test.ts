import { describe, expect, it } from 'vitest';
import { toPanScroll } from './use-middle-pan.helpers.ts';

describe('toPanScroll', () => {
  it('should move the lanes with the pointer, in both directions', () => {
    const start = { x: 500, y: 300, scrollLeft: 200, scrollTop: 50 };

    expect(toPanScroll(start, { x: 400, y: 340 })).toEqual({ left: 300, top: 10 });
    expect(toPanScroll(start, start)).toEqual({ left: 200, top: 50 });
  });
});
