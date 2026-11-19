import { KIND_COLORS } from '../../build-order.constants.ts';
import { TIMELINE_BACKGROUND } from '../timeline.constants.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import type { IdleSpan, TimeScale } from '../timeline.types.ts';

interface IdleHatchProps {
  span: IdleSpan;
  scale: TimeScale;
}

// Room needed to write 'idle 0:14' inside the hatch.
const LABEL_MIN_PX = 44;

// Producer ready with an empty queue: orange hatch on the bar row, never used for a wait after a click.
export const IdleHatch = ({ span, scale }: IdleHatchProps) => {
  const { rowHeight, barHeight } = useTimelineMetrics();
  const width = (span.to - span.from) * scale.pixelsPerSecond;
  return (
    <span
      title={span.label ?? undefined}
      data-hover-mark=""
      className="absolute flex items-center justify-center overflow-hidden"
      style={{
        left: span.from * scale.pixelsPerSecond,
        width,
        top: (rowHeight - barHeight) / 2,
        height: barHeight,
        background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${KIND_COLORS.idle} 35%, transparent) 0 2px, transparent 2px 6px)`,
        borderBlock: `1px solid color-mix(in srgb, ${KIND_COLORS.idle} 60%, transparent)`,
        zIndex: 1,
      }}
    >
      {span.label !== null && width >= LABEL_MIN_PX && (
        <span
          className="px-[3px] text-[10px] leading-[1.3] font-bold whitespace-nowrap"
          style={{ color: KIND_COLORS.idle, background: TIMELINE_BACKGROUND }}
        >
          {span.label}
        </span>
      )}
    </span>
  );
};
