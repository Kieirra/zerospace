import { useEffect, useRef, useState } from 'react';
import { SETUP_HERO_KEY } from '../timeline.constants.ts';
import { toEdgeScroll } from './use-bar-drag.helpers.ts';
import { isOnLabelColumn, isPastThreshold, OWN_GESTURE_SELECTOR, toContentPoint, toHitUids, toSelectionBox } from './use-selection-rect.helpers.ts';
import { swallowNextClick } from './swallow-next-click.ts';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { TimelineEditing } from '../timeline-editing.ts';
import type { Box } from './use-selection-rect.helpers.ts';

// Editor (Kieirra 2026-11-19): a press anywhere on the timeline (curves, axis, void of the lanes, idle time) then a
// drag draws a rectangle; on release the steps it touches are selected, added to the selection with Ctrl/Cmd/Shift.
// A press released in place is a click in the void: it clears the selection. The marks, the click handles, the fold
// of a lane group and the lane names keep their own gesture. The frame scrolls near its edges; Escape cancels.
export const useSelectionRect = (frameRef: RefObject<HTMLElement | null>, editing: TimelineEditing) => {
  const [rect, setRect] = useState<Box | null>(null);
  const stopSession = useRef<(() => void) | null>(null);
  useEffect(() => () => stopSession.current?.(), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || event.button !== 0 || !event.isPrimary || stopSession.current) return;
    const frame = frameRef.current;
    if (!frame || target.closest(OWN_GESTURE_SELECTOR)) return;
    if (isOnLabelColumn(event.clientX, frame.getBoundingClientRect().left + frame.clientLeft)) return;
    const zone = event.currentTarget;
    const isAdditive = event.ctrlKey || event.metaKey || event.shiftKey;
    const start = toContentPoint({ x: event.clientX, y: event.clientY }, zone.getBoundingClientRect());
    let pointer = { x: event.clientX, y: event.clientY };
    let scrollLeft = frame.scrollLeft;
    let current: Box | null = null;
    let frameRequest = 0;

    const update = () => {
      const end = toContentPoint(pointer, zone.getBoundingClientRect());
      if (current === null && !isPastThreshold(start, end)) return;
      current = toSelectionBox(start, end);
      setRect(current);
    };
    // Near an edge the frame scrolls by itself; any scroll (wheel, trackpad) moves the rectangle's far corner.
    const followScroll = () => {
      const frame = frameRef.current;
      if (frame && current) frame.scrollLeft += toEdgeScroll(pointer.x, frame.getBoundingClientRect());
      if (frame && frame.scrollLeft !== scrollLeft) {
        scrollLeft = frame.scrollLeft;
        update();
      }
      frameRequest = requestAnimationFrame(followScroll);
    };
    const onPointerMove = (moveEvent: PointerEvent) => {
      pointer = { x: moveEvent.clientX, y: moveEvent.clientY };
      update();
    };
    const onPointerUp = () => {
      const drawn = current;
      stop();
      if (drawn === null) {
        if (!isAdditive) editing.onClearSelection();
        return;
      }
      swallowNextClick();
      editing.onSelectRect(toHitUids(drawn, toMarkBoxes(zone)), isAdditive);
    };
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return;
      keyEvent.preventDefault();
      stop();
    };
    const stop = () => {
      cancelAnimationFrame(frameRequest);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      stopSession.current = null;
      setRect(null);
    };

    frameRequest = requestAnimationFrame(followScroll);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', stop);
    // Before the editor shortcuts: this Escape only cancels the rectangle.
    window.addEventListener('keydown', onKeyDown, { capture: true });
    stopSession.current = stop;
  };

  return { rect, onPointerDown };
};

// Marks of the steps (the setup hero is none) in the coordinates of the lanes zone.
const toMarkBoxes = (zone: HTMLElement) => {
  const zoneRect = zone.getBoundingClientRect();
  return [...zone.querySelectorAll<HTMLElement>('[data-step-uid]')].flatMap((mark) => {
    const uid = mark.dataset.stepUid;
    if (!uid || uid === SETUP_HERO_KEY) return [];
    const { left, top, width, height } = mark.getBoundingClientRect();
    return [{ uid, box: { left: left - zoneRect.left, top: top - zoneRect.top, width, height } }];
  });
};
