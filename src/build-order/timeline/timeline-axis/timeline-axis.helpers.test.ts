import { describe, expect, it } from 'vitest';
import { toAxisSteps, toAxisTicks } from './timeline-axis.helpers.ts';

describe('toAxisTicks', () => {
  it('should label every 30 seconds and tick every 10 seconds, like a ruler (Kieirra 2026-11-19)', () => {
    expect(toAxisTicks({ totalSeconds: 60, pixelsPerSecond: 4 })).toEqual([
      { seconds: 0, label: '0:00' },
      { seconds: 10, label: null },
      { seconds: 20, label: null },
      { seconds: 30, label: '0:30' },
      { seconds: 40, label: null },
      { seconds: 50, label: null },
      { seconds: 60, label: '1:00' },
    ]);
  });

  it('should label every minute when 30 seconds are narrower than 40 px, still ticking every 10 seconds', () => {
    expect(toAxisSteps(1.3)).toEqual({ labelSeconds: 60, tickSeconds: 10 });
    expect(toAxisTicks({ totalSeconds: 60, pixelsPerSecond: 1.3 }).filter(({ label }) => label !== null)).toEqual([
      { seconds: 0, label: '0:00' },
      { seconds: 60, label: '1:00' },
    ]);
  });

  it('should tick every 30 seconds when 10 seconds are narrower than 4 px', () => {
    expect(toAxisSteps(0.3)).toEqual({ labelSeconds: 60, tickSeconds: 30 });
    expect(toAxisTicks({ totalSeconds: 60, pixelsPerSecond: 0.3 }).map(({ seconds }) => seconds)).toEqual([0, 30, 60]);
  });

  it('should keep the 30 seconds labels at 40 px or more', () => {
    expect(toAxisSteps(1.4)).toEqual({ labelSeconds: 30, tickSeconds: 10 });
  });
});
