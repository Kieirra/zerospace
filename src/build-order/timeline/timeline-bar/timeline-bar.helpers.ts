import { MIN_CHIP_PX } from '../timeline.constants.ts';

// Room left at the end of a unit bar: copies made one after another read one by one, even too short for their
// name (harvesters, Mazar 2026-11-17).
const UNIT_GAP_PX = 2;

// Width of a bar: its time on the axis, one chip at least past the click mark drawn on its start (Kieirra 2026-11-19),
// so that a short or instant step keeps its icon, the start of its name and room to click it.
export const toBarWidthPx = (seconds: number, isUnit: boolean, contentInset: number, pixelsPerSecond: number) =>
  Math.max(MIN_CHIP_PX + contentInset, seconds * pixelsPerSecond - (isUnit ? UNIT_GAP_PX : 0));
