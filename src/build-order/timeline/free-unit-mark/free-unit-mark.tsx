import { KIND_COLORS } from '../../build-order.constants.ts';
import { RemovableMark } from '../removable-mark/removable-mark.tsx';
import { MARK_PX } from '../timeline.constants.ts';
import { toItemButtonProps } from '../timeline.helpers.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { toHighlightStyle, toSelectedStyle } from '../timeline.styles.ts';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface FreeUnitMarkProps {
  item: TimelineItem;
  at: number;
  imageUrl?: string;
  scale: TimeScale;
  isHighlighted: boolean;
  isSelected: boolean;
  events: TimelineItemEvents;
}

const DOT_PX = 6;

// Free unit of a talent or an event (US-008): a point and the unit's icon, no name, their count when made at once.
// Neither moved nor removed: a click selects the step that made it.
export const FreeUnitMark = ({ item, at, imageUrl, scale, isHighlighted, isSelected, events }: FreeUnitMarkProps) => {
  const { rowHeight } = useTimelineMetrics();
  return (
    <RemovableMark item={item} left={at * scale.pixelsPerSecond - DOT_PX / 2} top={item.row * rowHeight + (rowHeight - MARK_PX) / 2}>
      <button
        type="button"
        {...toItemButtonProps(item, events)}
        aria-selected={isSelected || undefined}
        className="relative flex h-5 cursor-pointer items-center gap-1"
        style={{ ...toHighlightStyle(isHighlighted), ...toSelectedStyle(isSelected) }}
      >
        <span className="inline-block shrink-0 rounded-full" style={{ width: DOT_PX, height: DOT_PX, background: KIND_COLORS.unit }} />
        {imageUrl && <img src={imageUrl} alt="" width={15} height={15} className="size-[15px] shrink-0 object-contain" />}
        {item.count > 1 && (
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: KIND_COLORS.unit }}>
            {item.count}
          </span>
        )}
      </button>
    </RemovableMark>
  );
};
