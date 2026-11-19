import { useEffect, useRef, useState } from 'react';
import { settleMarks } from './settle-marks.ts';
import { findClickHandle, findStepMark, toDragDelta, toDragGhost, toEdgeScroll, toLaneIdAt, toPointerTime } from './use-bar-drag.helpers.ts';
import { isPastThreshold } from './use-selection-rect.helpers.ts';
import { swallowNextClick } from './swallow-next-click.ts';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { DragSource, DropPreview, DropTarget, TimelineEditing } from '../timeline-editing.ts';
import type { TimeScale } from '../timeline.types.ts';
import type { Box } from './use-selection-rect.helpers.ts';

// Ghost of the dragged mark, in the coordinates of the lanes zone.
interface DragGhost extends Box {
  label: string;
}

export interface TimelineDrag {
  source: DragSource;
  // Click time the drop gives (the line on the axis), else the time under the pointer.
  t: number;
  preview: DropPreview;
  ghost: DragGhost | null;
}

// A drag with the target of its drop.
export interface TargetedDrag extends TimelineDrag {
  target: DropTarget;
}

// Editor (Kieirra 2026-11-19): drag the mark of a step sideways to move its time by whole seconds, the selection with
// it; units dragged over another lane go on it. The ghost follows the pointer on its lane (or the lane it goes to); the
// line shows the click time the drop records; a refused drop shows the not-allowed cursor; Escape cancels; a release
// in place changes nothing. The click handle of a step (Kieirra 2026-11-19) drags the same way, without ghost: only the
// step's time `at` moves, the line on it.
export const useBarDrag = (
  frameRef: RefObject<HTMLElement | null>,
  scale: TimeScale,
  editing: TimelineEditing,
) => {
  const [drag, setDrag] = useState<TimelineDrag | null>(null);
  const [isRefused, setIsRefused] = useState(false);
  const stopSession = useRef<(() => void) | null>(null);
  useEffect(() => () => stopSession.current?.(), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const pressed = event.target instanceof Element ? event.target : null;
    const handle = pressed && findClickHandle(pressed);
    const mark = handle ?? (pressed && findStepMark(pressed));
    const uid = handle ? handle.dataset.clickUid : mark?.dataset.stepUid;
    if (!mark || !uid || (!handle && !editing.canDrag(uid)) || event.button !== 0 || !event.isPrimary || stopSession.current) return;
    const zone = event.currentTarget;
    const originRow = mark.closest<HTMLElement>('[data-lane-id]');
    const source: DragSource = handle ? { kind: 'click', uid } : { kind: 'step', uid, laneId: originRow?.dataset.laneId ?? null };
    const startX = event.clientX;
    const startY = event.clientY;
    const press = { x: startX, scrollLeft: frameRef.current?.scrollLeft ?? 0 };
    const markRect = mark.getBoundingClientRect();
    const zoneRect = zone.getBoundingClientRect();
    const grab = startX - markRect.left;
    // Height of the mark in its lane: kept on the lane the units go to.
    const rowOffset = markRect.top - (originRow?.getBoundingClientRect().top ?? markRect.top);
    const label = mark.getAttribute('aria-label')?.split(',')[0] ?? '';
    let lastX = startX;
    let lastY = startY;
    let isMoving = false;
    let current: TargetedDrag | null = null;
    let frameRequest = 0;

    const update = () => {
      const zoneBox = zone.getBoundingClientRect();
      // The zone moves sideways when the frame scrolls, never up or down.
      const zoneNow = { left: zoneBox.left, top: zoneRect.top };
      const now = { x: lastX, scrollLeft: frameRef.current?.scrollLeft ?? 0 };
      const laneId = toLaneIdAt(document.elementFromPoint(lastX, lastY));
      const target = { t: toPointerTime(lastX, zoneNow.left, scale), delta: toDragDelta(press, now, scale.pixelsPerSecond), laneId };
      // The drop gives the very action previewed here: the line shows the time it records.
      const preview = editing.previewDrop(source, target);
      setIsRefused(preview === null);
      if (!preview) {
        current = null;
        setDrag(null);
        return;
      }
      const ghost = source.kind === 'step' ? toDragGhost(lastX, grab, zoneNow, markRect, label) : null;
      const laneRow = preview.laneId === null ? null : zone.querySelector(`[data-lane-id="${CSS.escape(preview.laneId)}"]`);
      if (ghost && laneRow) ghost.top = laneRow.getBoundingClientRect().top - zoneBox.top + rowOffset;
      current = { source, t: preview.at ?? target.t, target, preview, ghost };
      setDrag(current);
    };
    const followEdges = () => {
      const frame = frameRef.current;
      const scroll = frame ? toEdgeScroll(lastX, frame.getBoundingClientRect()) : 0;
      if (frame && scroll !== 0) {
        frame.scrollLeft += scroll;
        update();
      }
      frameRequest = requestAnimationFrame(followEdges);
    };
    const onPointerMove = (moveEvent: PointerEvent) => {
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
      if (!isMoving) {
        if (!isPastThreshold({ x: startX, y: startY }, { x: lastX, y: lastY })) return;
        frameRequest = requestAnimationFrame(followEdges);
        isMoving = true;
      }
      update();
    };
    const onPointerUp = () => {
      const dropped = current;
      stop();
      if (!isMoving) return;
      swallowNextClick();
      if (!dropped || dropped.preview.isSamePlace) return;
      const zoneBox = zone.getBoundingClientRect();
      editing.onDrop(source, dropped.target);
      if (dropped.ghost) settleMarks(uid, { left: zoneBox.left + dropped.ghost.left, top: zoneBox.top + dropped.ghost.top });
    };
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return;
      keyEvent.preventDefault();
      stop();
      // The button is still down: its release over the mark must not open the step just cancelled.
      window.addEventListener('pointerup', swallowNextClick, { once: true });
    };
    const stop = () => {
      cancelAnimationFrame(frameRequest);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      stopSession.current = null;
      setDrag(null);
      setIsRefused(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', stop);
    // Before the step panel: this Escape only cancels the drag.
    window.addEventListener('keydown', onKeyDown, { capture: true });
    stopSession.current = stop;
  };

  return { drag, isRefused, onPointerDown };
};
