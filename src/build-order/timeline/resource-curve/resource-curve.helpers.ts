import { CURVE_HEIGHT_PX } from '../timeline.constants.ts';
import type { ResourceTrack } from '../timeline.types.ts';

// Room kept above the peak.
const TOP_MARGIN_PX = 4;

// SVG points in a viewBox of (totalSeconds × CURVE_HEIGHT_PX): x in seconds, y scaled to track.max.
export const toSvgPoints = ({ points, max }: ResourceTrack) =>
  points
    .map(({ t, value }) => `${t},${(CURVE_HEIGHT_PX - (value / max) * (CURVE_HEIGHT_PX - TOP_MARGIN_PX)).toFixed(2)}`)
    .join(' ');
