import { describe, expect, it } from 'vitest';
import { toWindowFitHeight } from './use-window-fit-height.helpers.ts';

describe('toWindowFitHeight', () => {
  it('should take the window from the top of the element, the room under it left free', () => {
    expect(toWindowFitHeight(900, 300.4, 56, 240)).toBe(543);
  });

  it('should keep the minimum height on a short window', () => {
    expect(toWindowFitHeight(500, 400, 56, 240)).toBe(240);
  });
});
