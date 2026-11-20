import clsx from 'clsx';
import { RemovableMark } from '../removable-mark/removable-mark.tsx';
import { MARK_PX, REMOVE_BUTTON_PX, TIMELINE_BACKGROUND } from '../timeline.constants.ts';
import { toItemButtonProps } from '../timeline.helpers.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { POINT_ERROR_FILL_STYLE, toHighlightStyle, toSelectedStyle } from '../timeline.styles.ts';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface PointMarkProps {
  item: TimelineItem;
  at: number;
  imageUrl?: string;
  scale: TimeScale;
  isHighlighted: boolean;
  isSelected: boolean;
  events: TimelineItemEvents;
  color: string;
  diamondPx: number;
  // Widest the mark gets: past it the label is cut, the diamond stays whole.
  maxWidth?: number;
}

// Instant step: a diamond on its time, its icon and its label.
export const PointMark = ({ item, at, imageUrl, scale, isHighlighted, isSelected, events, color, diamondPx, maxWidth }: PointMarkProps) => {
  const { rowHeight } = useTimelineMetrics();
  const isCapped = maxWidth !== undefined;
  const label = item.hasError ? `✖ ${item.label}` : item.label;
  return (
    <RemovableMark item={item} left={at * scale.pixelsPerSecond - diamondPx / 2} top={item.row * rowHeight + (rowHeight - MARK_PX) / 2}>
      <button
        type="button"
        {...toItemButtonProps(item, events)}
        aria-selected={isSelected || undefined}
        className="relative flex h-5 cursor-pointer items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap"
        style={{
          ...toHighlightStyle(isHighlighted),
          maxWidth,
          color,
          ...(item.hasError ? POINT_ERROR_FILL_STYLE : {}),
          // Room of its ✕, like the end of a bar: never over the label.
          paddingRight: REMOVE_BUTTON_PX,
          ...toSelectedStyle(isSelected),
        }}
      >
        <span
          className={clsx('inline-block', isCapped && 'shrink-0', 'rotate-45')}
          style={{ width: diamondPx, height: diamondPx, background: color, boxShadow: `0 0 0 2px ${TIMELINE_BACKGROUND}` }}
        />
        {imageUrl && <img src={imageUrl} alt="" width={15} height={15} className="size-[15px] shrink-0 object-contain" />}
        {isCapped ? <span className="truncate">{label}</span> : label}
      </button>
    </RemovableMark>
  );
};
