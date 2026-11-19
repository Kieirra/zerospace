import { RemovableMark } from '../removable-mark/removable-mark.tsx';
import { BAR_LABEL_MIN_PX } from '../timeline.constants.ts';
import { toItemButtonProps } from '../timeline.helpers.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import {
  BAR_STYLES,
  MERCENARY_BUILDING_STYLE,
  RESEARCH_BUILDING_STYLE,
  toErrorFillStyle,
  toHighlightStyle,
  toSelectedStyle,
} from '../timeline.styles.ts';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface TimelineBarProps {
  item: TimelineItem & { shape: 'building' | 'unit' | 'research' | 'hero' };
  startAt: number;
  endAt: number;
  imageUrl?: string;
  // Room left free at the start of the bar (click mark drawn over it).
  contentInset?: number;
  scale: TimeScale;
  isHighlighted: boolean;
  // Editor: step selected on the timeline.
  isSelected?: boolean;
  events: TimelineItemEvents;
}

const MIN_BAR_PX = 3;
// Room left at the end of a unit bar: copies made one after another read one by one, even too short for their
// name (harvesters, Mazar 2026-11-17).
const UNIT_GAP_PX = 2;
// The entity icon shows from this width; the name needs BAR_LABEL_MIN_PX more.
const ICON_MIN_PX = 20;
const ICON_PX = 15;
// Dark tile behind the icon: most wiki images are light and would melt into the bar color.
const ICON_TILE_STYLE = {
  width: ICON_PX + 2,
  height: ICON_PX + 2,
  padding: 1,
  background: 'rgb(13 13 18 / 0.85)',
  boxShadow: '0 0 0 1px rgb(255 255 255 / 0.25)',
};

export const TimelineBar = ({
  item,
  startAt,
  endAt,
  imageUrl,
  contentInset = 0,
  scale,
  isHighlighted,
  isSelected = false,
  events,
}: TimelineBarProps) => {
  const { rowHeight, barHeight } = useTimelineMetrics();
  const gap = item.shape === 'unit' ? UNIT_GAP_PX : 0;
  const width = Math.max(MIN_BAR_PX, (endAt - startAt) * scale.pixelsPerSecond - gap);
  const shapeStyle = item.isMercenary
    ? MERCENARY_BUILDING_STYLE
    : item.isResearchBuilding
      ? RESEARCH_BUILDING_STYLE
      : BAR_STYLES[item.shape];
  return (
    <RemovableMark item={item} left={startAt * scale.pixelsPerSecond} top={item.row * rowHeight + (rowHeight - barHeight) / 2}>
      <button
        type="button"
        {...toItemButtonProps(item, events)}
        aria-selected={isSelected || undefined}
        className="relative flex cursor-pointer items-center gap-1 overflow-hidden px-[3px] text-left text-[11px] font-semibold transition-[filter] duration-100 focus-visible:outline-offset-[-2px]"
        style={{
          ...(item.hasError ? toErrorFillStyle(shapeStyle) : shapeStyle),
          ...toHighlightStyle(isHighlighted),
          width,
          height: barHeight,
          // Never wider than the bar: a padding past its width would grow it over the next copy.
          paddingLeft: Math.min(3 + contentInset, Math.max(0, width - 3)),
          ...toSelectedStyle(isSelected),
        }}
      >
        {imageUrl && width >= contentInset + ICON_MIN_PX && (
          <img
            src={imageUrl}
            alt=""
            width={ICON_PX}
            height={ICON_PX}
            className="shrink-0 rounded-[3px] object-contain"
            style={ICON_TILE_STYLE}
          />
        )}
        {width >= contentInset + BAR_LABEL_MIN_PX + (imageUrl ? ICON_PX : 0) && (
          <span className="truncate">
            {/* The error never shows by its color alone. */}
            {item.hasError && '✖ '}
            {item.shape === 'hero' ? `♛ ${item.label}` : item.label}
          </span>
        )}
      </button>
    </RemovableMark>
  );
};
