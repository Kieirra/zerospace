import { TIP_PX } from '../click-wait/click-wait.helpers.ts';
import { CLICK_ICON_PX } from '../timeline.constants.ts';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import type { TimelineItem, TimeScale } from '../timeline.types.ts';

interface ClickHandleProps {
  item: TimelineItem;
  clickAt: number;
  scale: TimeScale;
}

// Grip over the click symbol of a step whose click waits (Kieirra 2026-11-19): dragged sideways like a window edge, it
// moves the step's time `at` alone (useBarDrag); the step keeps its place in the simulation.
export const ClickHandle = ({ item, clickAt, scale }: ClickHandleProps) => {
  const { rowHeight } = useTimelineMetrics();
  return (
    <span
      role="img"
      aria-label="Click time"
      title="Click time"
      data-click-uid={item.stepUid}
      // Hides the time cursor (useTimeCursor).
      data-hover-mark=""
      className="absolute cursor-ew-resize"
      style={{
        left: clickAt * scale.pixelsPerSecond - TIP_PX,
        width: CLICK_ICON_PX,
        top: item.row * rowHeight,
        height: rowHeight,
        zIndex: 4,
      }}
    />
  );
};
