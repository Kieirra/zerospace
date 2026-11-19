import { describe, expect, it } from 'vitest';
import { HORIZON_SECONDS } from '../../../engine/engine.constants.ts';
import { formatClockInput, parseClockInput } from './click-at-field.helpers.ts';

describe('Click at: parse', () => {
  it('should read m:ss and a count of seconds', () => {
    expect(parseClockInput('2:35')).toBe(155);
    expect(parseClockInput('0:50')).toBe(50);
    expect(parseClockInput(' 12:05 ')).toBe(725);
    expect(parseClockInput('50')).toBe(50);
    expect(parseClockInput('0')).toBe(0);
  });

  it('should hold the time to the end of the simulation', () => {
    expect(parseClockInput('99:00')).toBe(HORIZON_SECONDS);
    expect(parseClockInput('5000')).toBe(HORIZON_SECONDS);
  });

  it('should refuse what is not a time', () => {
    for (const text of ['', ' ', '2:5', '2:60', '-10', '1.5', 'abc', '2:35:10', ':35', '2:']) {
      expect(parseClockInput(text)).toBeNull();
    }
  });
});

describe('Click at: format', () => {
  it('should write m:ss, and nothing for as soon as possible', () => {
    expect(formatClockInput(155)).toBe('2:35');
    expect(formatClockInput(5)).toBe('0:05');
    expect(formatClockInput(null)).toBe('');
  });
});
