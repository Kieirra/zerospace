import { useState } from 'react';
import { LABEL_COLUMN_PX } from '../timeline.constants.ts';
import { ENTITY_DRAG_TYPE, draggedEntity } from '../timeline-editing.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { toCardGhost, toLaneIdAt, toPointerTime } from './use-bar-drag.helpers.ts';
import type { DragEvent, RefObject } from 'react';
import type { DragSource, TimelineEditing } from '../timeline-editing.ts';
import type { TargetedDrag, TimelineDrag } from './use-bar-drag.ts';
import type { TimeScale } from '../timeline.types.ts';

const EDGE_PX = 48;
const EDGE_SCROLL_PX = 12;

// Editor (Kieirra 2026-11-19): a palette card dragged over the lanes shows when its step would start; dropped, a timed
// step is added at the time under the pointer, a unit there on the lane under it, its ghost on that lane where it would
// start. A refused drop gets the browser's not-allowed cursor. The browser's drag and drop: the card keeps its image.
export const usePaletteDrop = (frameRef: RefObject<HTMLElement | null>, scale: TimeScale, editing: TimelineEditing) => {
  const [drag, setDrag] = useState<TimelineDrag | null>(null);
  const metrics = useTimelineMetrics();

  const toDrag = (event: DragEvent<HTMLElement>): TargetedDrag | null => {
    const entityId = draggedEntity.id;
    if (entityId === null || !event.dataTransfer.types.includes(ENTITY_DRAG_TYPE)) return null;
    const zone = event.currentTarget.getBoundingClientRect();
    const t = toPointerTime(event.clientX, zone.left, scale);
    const source: DragSource = { kind: 'entity', entityId };
    const laneId = toLaneIdAt(event.target instanceof Element ? event.target : null);
    const target = { t, delta: 0, laneId };
    const preview = editing.previewDrop(source, target);
    if (!preview) return null;
    const laneRow = preview.laneId === null ? null : event.currentTarget.querySelector(`[data-lane-id="${CSS.escape(preview.laneId)}"]`);
    const ghost =
      preview.added && laneRow
        ? toCardGhost(preview.added, laneRow.getBoundingClientRect().top - zone.top, scale.pixelsPerSecond, metrics)
        : null;
    return { source, t: preview.at ?? t, target, preview, ghost };
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
