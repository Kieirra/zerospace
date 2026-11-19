import { formatClock } from '../../build-order.helpers.ts';
import {
  AXIS_LABEL_MIN_PX,
  AXIS_LABEL_SECONDS,
  AXIS_TICK_MIN_PX,
  AXIS_TICK_SECONDS,
  AXIS_WIDE_LABEL_SECONDS,
} from '../timeline.constants.ts';
import type { TimeScale } from '../timeline.types.ts';

// Seconds between two labels and between two ticks, wider when the scale is too tight to read them.
export const toAxisSteps = (pixelsPerSecond: number) => ({
  labelSeconds: AXIS_LABEL_SECONDS * pixelsPerSecond < AXIS_LABEL_MIN_PX ? AXIS_WIDE_LABEL_SECONDS : AXIS_LABEL_SECONDS,
  tickSeconds: AXIS_TICK_SECONDS * pixelsPerSecond < AXIS_TICK_MIN_PX ? AXIS_LABEL_SECONDS : AXIS_TICK_SECONDS,
});

// Every tick of the ruler; label null: a minor tick, drawn without text.
export const toAxisTicks = ({ totalSeconds, pixelsPerSecond }: TimeScale) => {
  const { labelSeconds, tickSeconds } = toAxisSteps(pixelsPerSecond);
  return Array.from({ length: Math.floor(totalSeconds / tickSeconds) + 1 }, (_, index) => {
    const seconds = index * tickSeconds;
    return { seconds, label: seconds % labelSeconds === 0 ? formatClock(seconds) : null };
  });
};
