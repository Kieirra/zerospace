import { describe, expect, it } from 'vitest';
import { toTitle } from './title-field.helpers.ts';

describe('toTitle', () => {
  it('should name an untitled build', () => {
    expect(toTitle('')).toBe('Untitled build');
    expect(toTitle('Sentinel push')).toBe('Sentinel push');
  });
});
