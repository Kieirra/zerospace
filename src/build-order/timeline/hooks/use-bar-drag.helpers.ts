import { LABEL_COLUMN_PX, SETUP_HERO_KEY } from '../timeline.constants.ts';
import type { PointerEvent } from 'react';
import type { LanesPointer } from '../timeline-editing.ts';
import type { TimeScale } from '../timeline.types.ts';
import type { Box } from './use-selection-rect.helpers.ts';

// Near the frame edges the timeline scrolls by itself, this fast per frame.
const EDGE_PX = 48;
const EDGE_SCROLL_PX = 10;

// Pointer and scroll of the frame at a moment of a mark drag.
interface DragPoint {
  x: number;
  scrollLeft: number;
}

// Time under the pointer, between 0 and the end of the timeline (`zoneLeft`: left edge of the lanes zone on screen).
export const toPointerTime = (pointerX: number, zoneLeft: number, scale: TimeScale) =>
  Math.min(Math.max((pointerX - zoneLeft - LABEL_COLUMN_PX) / scale.pixelsPerSecond, 0), scale.totalSeconds);

// Whole seconds a mark drag moves its time (Kieirra 2026-11-19): the pointer's way since the press plus the frame's
// scroll since then. Where the mark was grabbed never counts.
export const toDragDelta = (press: DragPoint, now: DragPoint, pixelsPerSecond: number) =>
  Math.round((now.x - press.x + now.scrollLeft - press.scrollLeft) / pixelsPerSecond);

// The ghost follows the pointer on the lane of the mark, in the coordinates of the lanes zone.
export const toDragGhost = (pointerX: number, grab: number, zone: Pick<Box, 'left' | 'top'>, mark: Box, label: string) => ({
  left: pointerX - grab - zone.left,
  top: mark.top - zone.top,
  width: mark.width,
  height: mark.height,
  label,
});

// Lane of the row holding the element, null outside any lane.
export const toLaneIdAt = (element: Element | null) => element?.closest<HTMLElement>('[data-lane-id]')?.dataset.laneId ?? null;

// Time and lane under the pointer when it is over a lane, its label column aside.
export const toLanesPointer = (event: PointerEvent<HTMLElement>, frame: HTMLElement | null, scale: TimeScale): LanesPointer | null => {
  const laneId = toLaneIdAt(event.target instanceof Element ? event.target : null);
  if (!laneId || !frame || event.clientX - frame.getBoundingClientRect().left < LABEL_COLUMN_PX) return null;
  return { t: toPointerTime(event.clientX, event.currentTarget.getBoundingClientRect().left, scale), laneId };
};

// Pixels to scroll the frame this frame: left over the label column's edge, right at the frame's right edge.
export const toEdgeScroll = (pointerX: number, frame: { left: number; right: number }) => {
  if (pointerX < frame.left + LABEL_COLUMN_PX + EDGE_PX) return -EDGE_SCROLL_PX;
  return pointerX > frame.right - EDGE_PX ? EDGE_SCROLL_PX : 0;
};

// Click handle of a step around an element (Kieirra 2026-11-19).
export const findClickHandle = (target: Element) => target.closest<HTMLElement>('[data-click-uid]');

// Mark of a step around an element: the setup hero is no step.
export const findStepMark = (target: Element) => {
  const mark = target.closest<HTMLElement>('[data-step-uid]');
  return mark && mark.dataset.stepUid !== SETUP_HERO_KEY ? mark : null;
};
