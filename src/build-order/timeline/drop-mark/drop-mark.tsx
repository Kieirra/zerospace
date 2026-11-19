import { AXIS_HEIGHT_PX, LABEL_COLUMN_PX } from '../timeline.constants.ts';
import type { TimelineDrag } from '../hooks/use-bar-drag.ts';
import type { TimeScale } from '../timeline.types.ts';

interface DropMarkProps {
  drag: TimelineDrag;
  scale: TimeScale;
}

const DROP_COLOR = '#c8b6ff';

// While dragging: the ghost of the dragged mark, a dashed line where it would start, and on the axis its click time
// and when it would start ('Click 2:35 · starts ≈ 2:41').
export const DropMark = ({ drag, scale }: DropMarkProps) => {
  const left = LABEL_COLUMN_PX + drag.t * scale.pixelsPerSecond;
  const { ghost, preview } = drag;
  return (
    <>
      {ghost && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute flex items-center overflow-hidden rounded-[3px] border border-dashed px-1 text-[11px] font-semibold whitespace-nowrap"
          style={{ ...ghost, zIndex: 12, borderColor: DROP_COLOR, background: 'rgb(200 182 255 / 0.25)', color: DROP_COLOR }}
        >
          {ghost.label}
        </span>
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 border-l-2 border-dashed"
        style={{ left, top: AXIS_HEIGHT_PX - 4, zIndex: 11, borderColor: DROP_COLOR }}
      />
      <span
        role="status"
        className="pointer-events-none absolute rounded-sm px-1.5 text-[10.5px] leading-[18px] font-semibold whitespace-nowrap text-[#0b0b10]"
        style={{ left: left + 3, top: 0, zIndex: 13, background: DROP_COLOR, opacity: preview.isSamePlace ? 0.7 : 1 }}
      >
        {preview.label}
      </span>
    </>
  );
};
