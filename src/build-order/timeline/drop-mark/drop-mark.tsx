import { AXIS_HEIGHT_PX, DROP_COLOR, LABEL_COLUMN_PX } from '../timeline.constants.ts';
import type { TimelineDrag } from '../hooks/use-bar-drag.ts';
import type { TimeScale } from '../timeline.types.ts';

interface DropMarkProps {
  drag: TimelineDrag;
  scale: TimeScale;
}

// While dragging: the ghost of the dragged mark and a dashed line where it would start; DropLabel gives its times on
// the axis.
export const DropMark = ({ drag, scale }: DropMarkProps) => {
  const left = LABEL_COLUMN_PX + drag.t * scale.pixelsPerSecond;
  const { ghost } = drag;
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
    </>
  );
};
