import { ClickIcon } from '../../click-icon/click-icon.tsx';
import { KIND_COLORS } from '../../build-order.constants.ts';
import { CLICK_ICON_PX, TIMELINE_BACKGROUND } from '../timeline.constants.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import { TIP_PX } from './click-wait.helpers.ts';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../timeline.types.ts';

interface ClickWaitProps {
  item: TimelineItem;
  clickAt: number;
  scale: TimeScale;
  isHighlighted: boolean;
  events: Pick<TimelineItemEvents, 'onEnter' | 'onLeave'>;
}

// Click symbol (tip exactly on clickAt) + dotted wait up to the start; never drawn for a step that never starts.
export const ClickWait = ({ item, clickAt, scale, isHighlighted, events }: ClickWaitProps) => {
  const { rowHeight } = useTimelineMetrics();
  const until = item.startAt ?? clickAt;
  return (
    <div
      aria-hidden="true"
      // Hides the time cursor (useTimeCursor).
      data-hover-mark=""
      onMouseEnter={() => events.onEnter(item)}
      onMouseLeave={events.onLeave}
      className="absolute"
      style={{
        left: clickAt * scale.pixelsPerSecond,
        width: Math.max(0, (until - clickAt) * scale.pixelsPerSecond),
        top: item.row * rowHeight,
        height: rowHeight,
        zIndex: 3,
        filter: isHighlighted ? 'brightness(1.3)' : undefined,
      }}
    >
      <span
        className="absolute inset-x-0"
        style={{ top: rowHeight / 2 - 1, borderTop: `2px dotted ${KIND_COLORS.click}` }}
      />
      <span
        className="absolute"
        style={{ left: -TIP_PX, top: rowHeight / 2 - TIP_PX, filter: 'drop-shadow(0 0 1px #000)' }}
      >
        <ClickIcon size={CLICK_ICON_PX} />
      </span>
      {item.waitLabel !== null && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 px-0.5 text-[9.5px] leading-[1.1] font-bold whitespace-nowrap"
          style={{ color: KIND_COLORS.click, background: TIMELINE_BACKGROUND }}
        >
          {item.waitLabel}
        </span>
      )}
    </div>
  );
};
