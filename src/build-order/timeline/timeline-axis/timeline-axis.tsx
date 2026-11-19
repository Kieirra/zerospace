import { LABEL_COLUMN_PX, TIMELINE_BACKGROUND } from '../timeline.constants.ts';
import { toAxisTicks } from './timeline-axis.helpers.ts';
import type { TimeScale } from '../timeline.types.ts';

interface TimelineAxisProps {
  scale: TimeScale;
}

// Ruler: 'm:ss' on the major ticks, a small mark on the minor ones; the lanes draw a line under each label.
export const TimelineAxis = ({ scale }: TimelineAxisProps) => (
  <div className="flex" aria-hidden="true">
    <div className="sticky left-0 z-10 shrink-0" style={{ width: LABEL_COLUMN_PX, background: TIMELINE_BACKGROUND }} />
    <div className="relative h-[22px] shrink-0" style={{ width: scale.totalSeconds * scale.pixelsPerSecond }}>
      {toAxisTicks(scale).map(({ seconds, label }) =>
        label === null ? (
          <span key={seconds} className="absolute bottom-1 h-1 border-l border-[#3a3942]" style={{ left: seconds * scale.pixelsPerSecond }} />
        ) : (
          <span
            key={seconds}
            className="absolute bottom-1 border-l border-[#3a3942] pl-1 text-[11px] leading-none text-muted tabular-nums"
            style={{ left: seconds * scale.pixelsPerSecond }}
          >
            {label}
          </span>
        ),
      )}
    </div>
  </div>
);
