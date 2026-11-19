import { createContext, useContext } from 'react';

// Sizes of the lanes: one line high, the summary ('ready 0:52') in the label tooltip.
export interface TimelineMetrics {
  rowHeight: number;
  barHeight: number;
  curveHeight: number;
}

export const COMPACT_METRICS: TimelineMetrics = { rowHeight: 24, barHeight: 18, curveHeight: 30 };

export const TimelineMetricsContext = createContext(COMPACT_METRICS);

export const useTimelineMetrics = () => useContext(TimelineMetricsContext);
