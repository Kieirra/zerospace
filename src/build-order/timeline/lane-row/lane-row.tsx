import { KIND_COLORS } from '../../build-order.constants.ts';
import { toAxisSteps } from '../timeline-axis/timeline-axis.helpers.ts';
import { LABEL_COLUMN_PX, RIGHT_LABEL_COLUMN_PX, TIMELINE_BACKGROUND } from '../timeline.constants.ts';
import type { ReactNode } from 'react';
import type { LaneNote, TimeScale } from '../timeline.types.ts';

interface LaneRowProps {
  // Engine lane id: a card dropped over the row knows its lane.
  laneId?: string;
  label: string;
  summary: string;
  height: number;
  scale: TimeScale;
  // Right column fixed while scrolling; null keeps the column empty.
  rightLabel?: LaneNote | null;
  children: ReactNode;
}

// Label column (fixed while scrolling) + track with a line under each axis label, + the right label column when given.
export const LaneRow = ({ laneId, label, summary, height, scale, rightLabel, children }: LaneRowProps) => {
  return (
    <div data-lane-id={laneId} className="flex border-t border-white/[0.03]">
      <div
        title={summary === '' ? undefined : `${label} · ${summary}`}
        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center pr-3 pl-4 text-[12.5px] leading-tight"
        style={{ width: LABEL_COLUMN_PX, background: TIMELINE_BACKGROUND }}
      >
        <span className="truncate">{label}</span>
      </div>
      <div
        className="relative shrink-0"
        style={{
          width: scale.totalSeconds * scale.pixelsPerSecond,
          height,
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,.055) 1px, transparent 1px)',
          backgroundSize: `${toAxisSteps(scale.pixelsPerSecond).labelSeconds * scale.pixelsPerSecond}px 100%`,
        }}
      >
        {children}
      </div>
      {rightLabel !== undefined && (
        <div
          className="sticky right-0 z-10 flex shrink-0 items-center justify-end pr-3 pl-2 text-[11px] whitespace-nowrap text-muted tabular-nums"
          style={{
            width: RIGHT_LABEL_COLUMN_PX,
            background: TIMELINE_BACKGROUND,
            color: rightLabel ? NOTE_COLORS[rightLabel.tone] : undefined,
          }}
        >
          {rightLabel?.text}
        </div>
      )}
    </div>
  );
};

const NOTE_COLORS: Record<LaneNote['tone'], string | undefined> = {
  click: KIND_COLORS.click,
  warn: KIND_COLORS.idle,
  muted: undefined,
};
