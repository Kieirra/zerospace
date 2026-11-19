import { formatClock } from '../../build-order.helpers.ts';
import { KIND_COLORS } from '../../build-order.constants.ts';
import type { TimeScale } from '../timeline.types.ts';

interface ReadyMarkProps {
  readyAt: number;
  scale: TimeScale;
}

// Dotted vertical line across the lane where the building is ready: production starts from there.
export const ReadyMark = ({ readyAt, scale }: ReadyMarkProps) => (
  <span
    title={`Ready ${formatClock(readyAt)}`}
    data-hover-mark=""
    className="absolute inset-y-0.5"
    style={{
      left: readyAt * scale.pixelsPerSecond,
      borderLeft: `1px dotted color-mix(in srgb, ${KIND_COLORS.building} 55%, transparent)`,
      zIndex: 1,
    }}
  />
);
