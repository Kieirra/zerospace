import { KIND_COLORS } from '../../build-order.constants.ts';
import { TIMELINE_BACKGROUND } from '../timeline.constants.ts';
import { toItemButtonProps } from '../timeline.helpers.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { toHighlightStyle } from '../timeline.styles.ts';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface SetupHeroMarkProps {
  item: TimelineItem;
  at: number;
  imageUrl?: string;
  scale: TimeScale;
  isHighlighted: boolean;
  events: TimelineItemEvents;
}

const PORTRAIT_PX = 24;

// Free hero picked at match start: gold-ringed portrait at its time and its name, no click and no bar; 'free · 0:15'
// is in its tooltip only (Mazar 2026-11-17).
export const SetupHeroMark = ({ item, at, imageUrl, scale, isHighlighted, events }: SetupHeroMarkProps) => {
  const { rowHeight } = useTimelineMetrics();
  return (
    <button
      type="button"
      {...toItemButtonProps(item, events)}
      className="absolute flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap"
      style={{
        ...toHighlightStyle(isHighlighted),
        left: at * scale.pixelsPerSecond - PORTRAIT_PX / 2,
        top: item.row * rowHeight + (rowHeight - PORTRAIT_PX) / 2,
        color: KIND_COLORS.hero,
      }}
    >
      <span
        className="flex items-center justify-center overflow-hidden rounded-full bg-surface"
        style={{
          width: PORTRAIT_PX,
          height: PORTRAIT_PX,
          boxShadow: `0 0 0 2px ${KIND_COLORS.hero}, 0 0 0 4px ${TIMELINE_BACKGROUND}`,
        }}
      >
        {imageUrl ? <img src={imageUrl} alt="" className="size-full object-cover" /> : '♛'}
      </span>
      {item.label}
    </button>
  );
};
