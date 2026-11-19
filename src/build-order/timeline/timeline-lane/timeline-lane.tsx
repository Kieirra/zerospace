import { LaneRow } from '../lane-row/lane-row.tsx';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { useTimelineEditing } from '../timeline-editing.ts';
import { LaneItem } from './lane-item/lane-item.tsx';
import type { ReactNode } from 'react';
import type { BuildCatalog } from '../../build-order.types.ts';
import type { DisplayLane, LaneNote, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface TimelineLaneProps {
  lane: DisplayLane;
  scale: TimeScale;
  catalog: BuildCatalog;
  highlightedStepUid: string | null;
  events: TimelineItemEvents;
  // Right label column of the lane.
  rightLabel?: LaneNote | null;
  // Marks drawn under the items (idle time, ready mark).
  children?: ReactNode;
}

// Label column (fixed while scrolling) + track of stacked rows.
export const TimelineLane = ({ lane, scale, catalog, highlightedStepUid, events, rightLabel, children }: TimelineLaneProps) => {
  const { rowHeight } = useTimelineMetrics();
  const { selectedUids } = useTimelineEditing();
  return (
    <LaneRow laneId={lane.id} label={lane.label} summary={lane.summary} height={lane.rowCount * rowHeight} scale={scale} rightLabel={rightLabel}>
      {children}
      {lane.items.map((item) => (
        <LaneItem
          key={item.stepUid}
          item={item}
          scale={scale}
          imageUrl={catalog.get(item.entityId)?.imageUrl}
          isHighlighted={item.stepUid === highlightedStepUid}
          isSelected={selectedUids.has(item.stepUid)}
          events={events}
        />
      ))}
    </LaneRow>
  );
};
