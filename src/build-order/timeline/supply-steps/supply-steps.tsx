import { KIND_COLORS } from '../../build-order.constants.ts';
import { toSvgPoints } from '../resource-curve/resource-curve.helpers.ts';
import { CURVE_HEIGHT_PX } from '../timeline.constants.ts';
import type { ResourceTrack, TimeScale } from '../timeline.types.ts';

interface SupplyStepsProps {
  track: ResourceTrack;
  scale: TimeScale;
}

// Free supply as stairs (Kieirra 2026-11-19).
export const SupplySteps = ({ track, scale }: SupplyStepsProps) => (
  <svg
    aria-hidden="true"
    viewBox={`0 0 ${scale.totalSeconds} ${CURVE_HEIGHT_PX}`}
    preserveAspectRatio="none"
    className="absolute inset-0 size-full overflow-visible"
  >
    <polyline
      points={toSvgPoints(track)}
      fill="none"
      stroke={KIND_COLORS.supply}
      strokeWidth={1.6}
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);
