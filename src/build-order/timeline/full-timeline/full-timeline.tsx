import { isEmptyBuild } from '../../build-editor/build-editor.helpers.ts';
import { useElementWidth } from '../../hooks/use-element-width.ts';
import { useItemPopovers } from '../hooks/use-item-popovers.ts';
import { IdleHatch } from '../idle-hatch/idle-hatch.tsx';
import { ProducerLanes } from '../producer-lanes/producer-lanes.tsx';
import { ReadyMark } from '../ready-mark/ready-mark.tsx';
import { withSlotLegend } from '../slot-marks/slot-marks.helpers.ts';
import { ResourcesGroup } from '../resources-group/resources-group.tsx';
import { useTimeCursor } from '../time-cursor/hooks/use-time-cursor.ts';
import { TimeCursor } from '../time-cursor/time-cursor.tsx';
import { getStateAt, toCursorAnnouncement } from '../time-cursor/time-cursor.helpers.ts';
import { TimelineFrame } from '../timeline-frame/timeline-frame.tsx';
import { TimelineLegend } from '../timeline-legend/timeline-legend.tsx';
import { TimelinePopovers } from '../timeline-popovers/timeline-popovers.tsx';
import { FALLBACK_FRAME_PX, LABEL_COLUMN_PX, RIGHT_LABEL_COLUMN_PX, TRACK_END_PADDING_PX } from '../timeline.constants.ts';
import { toLegendKinds, toTimelineItems, toTimeScale } from '../timeline.helpers.ts';
import { toProducerLanes } from '../timeline.lanes.ts';
import { COMPACT_METRICS, TimelineMetricsContext } from '../timeline.metrics.ts';
import { toFullLanes, toFullLegendKinds, toResourceTracks } from './full-timeline.helpers.ts';
import type { FullLane, TimelineViewProps } from '../timeline.types.ts';

const EMPTY_TEXT = 'Click or drag a card from Add to place your first building.';

// The lanes (one per building, in the order they begin) under the Resources group, with idle time,
// ready marks, queued time or stacks on the right, and the time cursor.
export const FullTimeline = ({ result, build, catalog, highlightedStepUid, onHighlight }: TimelineViewProps) => {
  const { ref, width } = useElementWidth<HTMLDivElement>(FALLBACK_FRAME_PX);
  const trackWidth = width - LABEL_COLUMN_PX - RIGHT_LABEL_COLUMN_PX - TRACK_END_PADDING_PX;
  const scale = toTimeScale(result.endTime, trackWidth);
  const items = toTimelineItems(result, catalog, build);
  const lanes = toFullLanes(toProducerLanes(items, result.lanes, scale), result.lanes);
  const { opened, events, close } = useItemPopovers(onHighlight);
  const { cursor, zoneProps } = useTimeCursor(result.endTime, scale, ref);
  const cursorState = cursor && getStateAt(result, cursor.t);

  const decorate = (lane: FullLane) => ({
    rightLabel: lane.rightLabel,
    overlay: (
      <>
        {lane.readyAt !== null && <ReadyMark readyAt={lane.readyAt} scale={scale} />}
        {lane.idle.map((span) => (
          <IdleHatch key={span.from} span={span} scale={scale} />
        ))}
      </>
    ),
  });

  return (
    <TimelineMetricsContext value={COMPACT_METRICS}>
      <section aria-label="Timeline" className="flex flex-col gap-2.5">
        <TimelineLegend kinds={withSlotLegend(toFullLegendKinds(toLegendKinds(items), lanes), lanes)} />
        <TimelineFrame
          frameRef={ref}
          scale={scale}
          zoneProps={zoneProps}
          cursorAt={cursor?.t ?? null}
          announcement={cursor?.isFromKeyboard && cursorState ? toCursorAnnouncement(cursorState) : ''}
        >
          {isEmptyBuild(build) && (
            <p className="py-1.5 text-[12.5px] text-muted" style={{ paddingLeft: LABEL_COLUMN_PX }}>
              {EMPTY_TEXT}
            </p>
          )}
          <ResourcesGroup tracks={toResourceTracks(result, scale.totalSeconds)} scale={scale} />
          {/* Two zones read apart: the resources above, the lanes below (Kieirra 2026-11-19). */}
          <div aria-hidden="true" className="my-2 border-t border-line" style={{ marginRight: -TRACK_END_PADDING_PX }} />
          <ProducerLanes
            lanes={lanes}
            scale={scale}
            catalog={catalog}
            highlightedStepUid={highlightedStepUid}
            events={events}
            decorate={decorate}
          />
        </TimelineFrame>
        {cursor && cursorState && (
          <TimeCursor state={cursorState} position={cursor.position} />
        )}
        <TimelinePopovers opened={opened} catalog={catalog} onClose={close} />
      </section>
    </TimelineMetricsContext>
  );
};
