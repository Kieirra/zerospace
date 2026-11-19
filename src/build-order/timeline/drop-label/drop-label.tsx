import { DROP_COLOR, LABEL_COLUMN_PX } from '../timeline.constants.ts';
import type { TimelineDrag } from '../hooks/use-bar-drag.ts';
import type { TimeScale } from '../timeline.types.ts';

interface DropLabelProps {
  drag: TimelineDrag;
  scale: TimeScale;
}

// While dragging, on the axis: the click time of the drop and when it would start ('Click 2:35 · starts ≈ 2:41'). Drawn
// with the axis, so it stays in sight when the lanes scroll up and down.
export const DropLabel = ({ drag, scale }: DropLabelProps) => (
  <span
    role="status"
    className="pointer-events-none absolute rounded-sm px-1.5 text-[10.5px] leading-[18px] font-semibold whitespace-nowrap text-[#0b0b10]"
    style={{
      left: LABEL_COLUMN_PX + drag.t * scale.pixelsPerSecond + 3,
      top: 0,
      background: DROP_COLOR,
      opacity: drag.preview.isSamePlace ? 0.7 : 1,
    }}
  >
    {drag.preview.label}
  </span>
);
