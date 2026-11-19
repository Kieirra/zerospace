import { formatClock } from '../../build-order.helpers.ts';
import { KIND_COLORS } from '../../build-order.constants.ts';
import { toSlotMarkTitle } from './slot-marks.helpers.ts';
import type { SlotMark, TimeScale } from '../timeline.types.ts';

interface SlotMarksProps {
  marks: SlotMark[];
  scale: TimeScale;
}

// Mercenary-color line across the lane of a mercenary building each time one of its slots can be spent.
export const SlotMarks = ({ marks, scale }: SlotMarksProps) =>
  marks.map((mark) => (
    <span
      key={mark.t}
      title={toSlotMarkTitle(mark, formatClock(mark.t))}
      data-hover-mark=""
      className="absolute inset-y-0"
      style={{
        left: mark.t * scale.pixelsPerSecond - 1,
        width: 2,
        background: KIND_COLORS.mercenary,
        zIndex: 1,
      }}
    />
  ));
