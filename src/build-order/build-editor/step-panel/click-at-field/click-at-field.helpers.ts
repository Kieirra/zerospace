import { formatClock } from '../../../build-order.helpers.ts';
import { clampAt } from '../../build-editor.timed.ts';

// 'm:ss' (seconds on two digits) or a count of seconds 'ss'.
const CLOCK_PATTERN = /^(?:(\d+):([0-5]\d)|(\d+))$/;

// Seconds typed in a Click at field, held between 0 and the end of the simulation; null when it is not a time.
export const parseClockInput = (text: string): number | null => {
  const match = CLOCK_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, minutes, seconds, total] = match;
  const value = total === undefined ? Number(minutes) * 60 + Number(seconds) : Number(total);
  return clampAt(value);
};

// '2:35'; empty for a unit made as soon as possible.
export const formatClockInput = (seconds: number | null) => (seconds === null ? '' : formatClock(seconds));
