import { describe, expect, it } from 'vitest';
import { toPanelPosition } from './step-panel.helpers.ts';

const viewport = { width: 1600, height: 1000 };
const panel = { width: 320, height: 200 };

describe('toPanelPosition', () => {
  it('should put the panel under its mark', () => {
    expect(toPanelPosition({ left: 400, top: 300, bottom: 320 }, panel, viewport)).toEqual({ left: 400, top: 328 });
  });

  it('should put the panel above a mark near the bottom of the window', () => {
    expect(toPanelPosition({ left: 400, top: 900, bottom: 920 }, panel, viewport)).toEqual({ left: 400, top: 692 });
  });

  it('should keep the panel inside the window on the right', () => {
    expect(toPanelPosition({ left: 1500, top: 300, bottom: 320 }, panel, viewport).left).toBe(1272);
  });

  it('should keep the panel inside the window when its mark is scrolled out on the left', () => {
    expect(toPanelPosition({ left: -200, top: 300, bottom: 320 }, panel, viewport).left).toBe(8);
  });
});
