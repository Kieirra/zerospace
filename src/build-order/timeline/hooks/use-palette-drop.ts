import { useState } from 'react';
import { LABEL_COLUMN_PX } from '../timeline.constants.ts';
import { ENTITY_DRAG_TYPE, draggedEntity } from '../timeline-editing.ts';
import { toLaneIdAt, toPointerTime } from './use-bar-drag.helpers.ts';
import type { DragEvent, RefObject } from 'react';
import type { DragSource, TimelineEditing } from '../timeline-editing.ts';
import type { TargetedDrag, TimelineDrag } from './use-bar-drag.ts';
import type { TimeScale } from '../timeline.types.ts';

const EDGE_PX = 48;
const EDGE_SCROLL_PX = 12;

// Editor (Kieirra 2026-11-19): a palette card dragged over the lanes shows when its step would start; dropped, a timed
// step is added at the time under the pointer, a unit on the lane under it. A refused drop is not accepted: the browser
// shows its not-allowed cursor. The browser's drag and drop: the card keeps its own drag image.
export const usePaletteDrop = (frameRef: RefObject<HTMLElement | null>, scale: TimeScale, editing: TimelineEditing) => {
  const [drag, setDrag] = useState<TimelineDrag | null>(null);

  const toDrag = (event: DragEvent<HTMLElement>): TargetedDrag | null => {
    const entityId = draggedEntity.id;
    if (entityId === null || !event.dataTransfer.types.includes(ENTITY_DRAG_TYPE)) return null;
    const t = toPointerTime(event.clientX, event.currentTarget.getBoundingClientRect().left, scale);
    const source: DragSource = { kind: 'entity', entityId };
    const laneId = toLaneIdAt(event.target instanceof Element ? event.target : null);
    const target = { t, delta: 0, laneId };
    const preview = editing.previewDrop(source, target);
    return preview ? { source, t: preview.at ?? t, target, preview, ghost: null } : null;
  };

  const dropProps = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      const next = toDrag(event);
      if (!next) {
        setDrag(null);
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      followEdges(frameRef.current, event.clientX);
      setDrag(next);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setDrag(null);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      const dropped = toDrag(event);
      setDrag(null);
      if (!dropped) return;
      event.preventDefault();
      editing.onDrop(dropped.source, dropped.target);
    },
  };

  return { drag, dropProps };
};

// Near an edge of the frame the timeline scrolls by itself (the browser does not while dragging a card).
const followEdges = (frame: HTMLElement | null, x: number) => {
  if (!frame) return;
  const rect = frame.getBoundingClientRect();
  if (x < rect.left + LABEL_COLUMN_PX + EDGE_PX) frame.scrollLeft -= EDGE_SCROLL_PX;
  else if (x > rect.right - EDGE_PX) frame.scrollLeft += EDGE_SCROLL_PX;
};
