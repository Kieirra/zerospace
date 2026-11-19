import { useEffect, useRef, useState } from 'react';
import { useScrollListener } from '../../../hooks/use-scroll-listener.ts';
import { AXIS_HEIGHT_PX, CURSOR_KEY_STEP_SECONDS, LABEL_COLUMN_PX, RIGHT_LABEL_COLUMN_PX } from '../../timeline.constants.ts';
import { clampCursorTime, toCursorTime } from '../time-cursor.helpers.ts';
import type { KeyboardEvent, PointerEvent, RefObject } from 'react';
import type { TimeScale } from '../../timeline.types.ts';

interface CursorAt {
  t: number;
  // Viewport point the card follows: the pointer, or the top of the line when moved with the keyboard.
  position: { x: number; y: number };
  isFromKeyboard: boolean;
  // Pointer over a mark or pressed (drag, selection): the cursor hides (Kieirra 2026-11-19).
  isOverMark: boolean;
}

interface PendingPointer {
  x: number;
  y: number;
  zone: HTMLElement;
  isPressed: boolean;
}

// Marks the pointer can hover or press: a step, its ✕, a mercenary or never starts mark, the setup hero, a click wait
// and its handle, a ready or slot mark, an idle hatch.
const MARK_SELECTOR = 'button, [data-hover-mark]';

// Time cursor on the lanes zone (between 0 and endTime, below the axis, right of the label column):
// pointer moves rendered once per frame, ←/→ ±5 s, Home / End, Escape hides it. Disabled when endTime is 0.
// No cursor under the right label column, fixed over the lanes, nor over a mark (Kieirra 2026-11-19).
export const useTimeCursor = (endTime: number, scale: TimeScale, frameRef: RefObject<HTMLElement | null>) => {
  const [cursor, setCursor] = useState<CursorAt | null>(null);
  const pending = useRef<PendingPointer | null>(null);
  const frameRequest = useRef<number | null>(null);

  useEffect(() => () => cancelFrame(frameRequest), []);

  const readPointer = () => {
    frameRequest.current = null;
    const pointer = pending.current;
    const frame = frameRef.current;
    if (!pointer || !frame) return;
    const zoneRect = pointer.zone.getBoundingClientRect();
    const frameLeft = frame.getBoundingClientRect().left + frame.clientLeft;
    const isOnLabels = pointer.x - frameLeft < LABEL_COLUMN_PX;
    const isOnRightLabels = pointer.x > frameLeft + frame.clientWidth - RIGHT_LABEL_COLUMN_PX;
    const isOnAxis = pointer.y - zoneRect.top < AXIS_HEIGHT_PX;
    const t = isOnLabels || isOnRightLabels || isOnAxis ? null : toCursorTime(pointer.x - zoneRect.left - LABEL_COLUMN_PX, scale, endTime);
    const isOverMark = pointer.isPressed || document.elementFromPoint(pointer.x, pointer.y)?.closest(MARK_SELECTOR) != null;
    setCursor(t === null ? null : { t, position: { x: pointer.x, y: pointer.y }, isFromKeyboard: false, isOverMark });
  };

  // The frame scrolled under a still pointer: the time and the mark under it changed.
  useScrollListener(cursor !== null && !cursor.isFromKeyboard, () => {
    frameRequest.current ??= requestAnimationFrame(readPointer);
  });

  if (endTime <= 0) return { cursor: null, zoneProps: {} };

  const toKeyboardCursor = (t: number, zone: HTMLElement): CursorAt => {
    const zoneRect = zone.getBoundingClientRect();
    const clamped = clampCursorTime(t, endTime);
    const x = zoneRect.left + LABEL_COLUMN_PX + clamped * scale.pixelsPerSecond;
    return { t: clamped, position: { x, y: zoneRect.top + AXIS_HEIGHT_PX }, isFromKeyboard: true, isOverMark: false };
  };

  const zoneProps = {
    role: 'group' as const,
    tabIndex: 0,
    'aria-label': 'Timeline cursor',
    'aria-keyshortcuts': 'ArrowLeft ArrowRight Home End Escape',
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      pending.current = { x: event.clientX, y: event.clientY, zone: event.currentTarget, isPressed: event.buttons !== 0 };
      frameRequest.current ??= requestAnimationFrame(readPointer);
    },
    onPointerLeave: () => {
      cancelFrame(frameRequest);
      setCursor(null);
    },
    onBlur: () => setCursor((current) => (current?.isFromKeyboard ? null : current)),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (!Object.hasOwn(KEY_MOVES, event.key)) return;
      const move = KEY_MOVES[event.key];
      // Escape with no cursor shown is left to the others (the step panel).
      if (move === null && cursor === null) return;
      event.preventDefault();
      const zone = event.currentTarget;
      setCursor((current) => (move === null ? null : toKeyboardCursor(move(current?.t ?? 0, endTime), zone)));
    },
  };

  return { cursor: cursor?.isOverMark ? null : cursor, zoneProps };
};

// New time from the current one; null hides the cursor.
const KEY_MOVES: Record<string, ((t: number, endTime: number) => number) | null> = {
  ArrowRight: (t) => t + CURSOR_KEY_STEP_SECONDS,
  ArrowLeft: (t) => t - CURSOR_KEY_STEP_SECONDS,
  Home: () => 0,
  End: (_, endTime) => endTime,
  Escape: null,
};

const cancelFrame = (frameRequest: { current: number | null }) => {
  if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current);
  frameRequest.current = null;
};
