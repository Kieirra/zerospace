import { SlotMarks } from '../slot-marks/slot-marks.tsx';
import { TimelineLane } from '../timeline-lane/timeline-lane.tsx';
import type { ReactNode } from 'react';
import type { BuildCatalog } from '../../build-order.types.ts';
import type { FullLane, LaneNote, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface ProducerLanesProps {
  lanes: FullLane[];
  scale: TimeScale;
  catalog: BuildCatalog;
  highlightedStepUid: string | null;
  events: TimelineItemEvents;
  // Right label and marks under the items of each lane.
  decorate: (lane: FullLane) => { rightLabel: LaneNote | null; overlay: ReactNode };
}

// One lane per building, with the mercenary slot marks.
export const ProducerLanes = ({
  lanes,
  scale,
  catalog,
  highlightedStepUid,
  events,
  decorate,
}: ProducerLanesProps) => (
  <div className="relative">
    {lanes.map((lane) => {
      const decoration = decorate(lane);
      return (
        <TimelineLane
          key={lane.id}
          lane={lane}
          scale={scale}
          catalog={catalog}
          highlightedStepUid={highlightedStepUid}
          events={events}
          rightLabel={decoration.rightLabel}
        >
          {decoration.overlay}
          <SlotMarks marks={lane.slotMarks} scale={scale} />
        </TimelineLane>
      );
    })}
  </div>
);
