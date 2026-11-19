import { LABEL_COLUMN_PX } from '../timeline.constants.ts';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

// A press moved less than this is a click, never a rectangle.
const THRESHOLD_PX = 4;

// Presses that keep their own gesture, never a rectangle: a step mark, a click handle, the fold of a lane group.
export const OWN_GESTURE_SELECTOR = '[data-step-uid], [data-click-uid], button[aria-expanded]';

// The lane names, fixed on the left of the frame (its border aside), never start a rectangle.
export const isOnLabelColumn = (pointerX: number, frameLeft: number) => pointerX - frameLeft < LABEL_COLUMN_PX;

// Point in the coordinates of the lanes zone, its content: the zone moves on screen when the frame scrolls, a point
// of its content does not.
export const toContentPoint = (client: Point, zone: Pick<Box, 'left' | 'top'>): Point => ({ x: client.x - zone.left, y: client.y - zone.top });

export const isPastThreshold = (start: Point, end: Point) => Math.abs(end.x - start.x) >= THRESHOLD_PX || Math.abs(end.y - start.y) >= THRESHOLD_PX;

// Rectangle from the press to the pointer, whichever way it is drawn.
export const toSelectionBox = (start: Point, end: Point): Box => ({
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

// Touching is not enough: the boxes must share some room.
export const intersects = (a: Box, b: Box) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

// Steps with a mark under the rectangle, once each (a step may have several marks).
export const toHitUids = (rect: Box, marks: { uid: string; box: Box }[]) => [
  ...new Set(marks.filter(({ box }) => intersects(rect, box)).map(({ uid }) => uid)),
];
