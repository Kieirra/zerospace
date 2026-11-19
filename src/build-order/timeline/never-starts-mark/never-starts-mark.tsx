import { RemovableMark } from '../removable-mark/removable-mark.tsx';
import { toItemButtonProps } from '../timeline.helpers.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { ERROR_COLOR, toHighlightStyle, toSelectedStyle } from '../timeline.styles.ts';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface NeverStartsMarkProps {
  item: TimelineItem;
  // Its click, else the end of construction of its lane (a unit never taken by its building).
  from: number;
  scale: TimeScale;
  isHighlighted: boolean;
  isSelected: boolean;
  events: TimelineItemEvents;
}

// An order clicked that never starts (no supply, no stack…): its red mark alone, at its click, with no endless wait
// behind it (Kieirra 2026-11-19); its tooltip and card say why.
export const NeverStartsMark = ({ item, from, scale, isHighlighted, isSelected, events }: NeverStartsMarkProps) => {
  const { rowHeight } = useTimelineMetrics();
  return (
    <RemovableMark item={item} left={from * scale.pixelsPerSecond} top={item.row * rowHeight + 2}>
      <button
        type="button"
        {...toItemButtonProps(item, events)}
        aria-selected={isSelected || undefined}
        className="relative flex cursor-pointer items-center text-[10.5px] font-bold whitespace-nowrap"
        style={{
          ...toHighlightStyle(isHighlighted),
          ...toSelectedStyle(isSelected),
          height: rowHeight - 4,
          color: ERROR_COLOR,
        }}
      >
        <span className="ml-1 rounded-sm bg-[#0D0D12] px-1">✖ {item.label} never starts</span>
      </button>
    </RemovableMark>
  );
};
