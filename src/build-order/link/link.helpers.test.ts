import { describe, expect, it } from 'vitest';
import { formatDataChangedText, formatDroppedText, readBuildCode, toAbsoluteUrl, toEditUrl } from './link.helpers.ts';

describe('Link: URLs and texts', () => {
  it('should read the code of the hash, whatever else it holds', () => {
    expect(readBuildCode('#b=3.abc')).toBe('3.abc');
    expect(readBuildCode('#x=1&b=3.abc')).toBe('3.abc');
    expect(readBuildCode('#b=3.ab%2Dc')).toBe('3.ab-c');
    expect(readBuildCode('#b=')).toBeNull();
    expect(readBuildCode('')).toBeNull();
  });

  it('should build the page URL', () => {
    expect(toEditUrl('3.abc')).toBe('/build-order/#b=3.abc');
    expect(toAbsoluteUrl(toEditUrl('3.abc'), 'https://zerospace.gg')).toBe('https://zerospace.gg/build-order/#b=3.abc');
  });

  it('should fill the banner texts', () => {
    expect(formatDataChangedText('1', '2')).toBe('Made with game data 1. Timings recomputed with current data (2).');
    expect(formatDroppedText(3)).toBe('3 step(s) removed: no longer in the game data.');
  });
});
