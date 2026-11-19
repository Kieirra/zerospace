import { KIND_COLORS } from '../../build-order.constants.ts';
import { RemovableMark } from '../removable-mark/removable-mark.tsx';
import { TIMELINE_BACKGROUND } from '../timeline.constants.ts';
import { toItemButtonProps } from '../timeline.helpers.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { ERROR_COLOR, ON_ERROR_COLOR, toHighlightStyle, toSelectedStyle } from '../timeline.styles.ts';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface MercenaryMarkProps {
  item: TimelineItem;
  startAt: number;
  imageUrl?: string;
  scale: TimeScale;
  isHighlighted: boolean;
  // Editor: step selected on the timeline.
  isSelected?: boolean;
  events: TimelineItemEvents;
}

const DIAMOND_PX = 12;
// Height of the mark (h-5).
const MARK_PX = 20;

// In error (Kieirra 2026-11-19): diamond and label on a solid red fill, the diamond still on startAt.
const ERROR_FILL_STYLE = { background: ERROR_COLOR, color: ON_ERROR_COLOR, paddingRight: 4, borderRadius: 2 };

// Instant recruit: a diamond on startAt and its label.
export const MercenaryMark = ({ item, startAt, imageUrl, scale, isHighlighted, isSelected = false, events }: MercenaryMarkProps) => {
  const { rowHeight } = useTimelineMetrics();
  return (
    <RemovableMark
      item={item}
      left={startAt * scale.pixelsPerSecond - DIAMOND_PX / 2}
      top={item.row * rowHeight + (rowHeight - MARK_PX) / 2}
    >
      <button
        type="button"
        {...toItemButtonProps(item, events)}
        aria-selected={isSelected || undefined}
        className="relative flex h-5 cursor-pointer items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap"
        style={{
          ...toHighlightStyle(isHighlighted),
          color: KIND_COLORS.mercenary,
          ...(item.hasError ? ERROR_FILL_STYLE : {}),
          ...toSelectedStyle(isSelected),
        }}
      >
        <span
          className="inline-block rotate-45"
          style={{
            width: DIAMOND_PX,
            height: DIAMOND_PX,
            background: KIND_COLORS.mercenary,
            boxShadow: `0 0 0 2px ${TIMELINE_BACKGROUND}`,
          }}
        />
        {imageUrl && <img src={imageUrl} alt="" width={15} height={15} className="size-[15px] shrink-0 object-contain" />}
        {item.hasError ? `✖ ${item.label}` : item.label}
      </button>
    </RemovableMark>
  );
};
