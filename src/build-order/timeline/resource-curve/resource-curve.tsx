import { CURVE_HEIGHT_PX } from '../timeline.constants.ts';
import { toSvgPoints } from './resource-curve.helpers.ts';
import type { ResourceTrack, TimeScale } from '../timeline.types.ts';

interface ResourceCurveProps {
  track: ResourceTrack;
  color: string;
  scale: TimeScale;
}

// Bank of a resource over time: line + light area, vertical scale = track.max.
export const ResourceCurve = ({ track, color, scale }: ResourceCurveProps) => {
  const line = toSvgPoints(track);
  const lastT = track.points.at(-1)?.t ?? 0;
  const firstT = track.points[0]?.t ?? 0;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${scale.totalSeconds} ${CURVE_HEIGHT_PX}`}
      preserveAspectRatio="none"
      className="absolute inset-0 size-full overflow-visible"
    >
      <polygon
        points={`${firstT},${CURVE_HEIGHT_PX} ${line} ${lastT},${CURVE_HEIGHT_PX}`}
        fill={`color-mix(in srgb, ${color} 13%, transparent)`}
      />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
