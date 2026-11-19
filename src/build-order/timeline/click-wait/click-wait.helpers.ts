import { CLICK_ICON_PX, CLICK_TIP_RATIO } from '../timeline.constants.ts';
import type { TimelineItem, TimeScale } from '../timeline.types.ts';

export const TIP_PX = CLICK_ICON_PX * CLICK_TIP_RATIO;

// Room the click mark takes on the right of the click time.
export const CLICK_MARK_REACH_PX = CLICK_ICON_PX - TIP_PX;

// Click time where the mark is drawn: only when the order waited after it, then started.
export const toClickMarkAt = ({ isClickedEarly, clickAt }: TimelineItem) => (isClickedEarly ? clickAt : null);

// The bar's icon and name start after the click mark when the mark sits on the bar's start.
export const toContentInset = (item: TimelineItem, markAt: number | null, scale: TimeScale) =>
  markAt !== null && item.startAt !== null
    ? Math.max(0, CLICK_MARK_REACH_PX - (item.startAt - markAt) * scale.pixelsPerSecond)
    : 0;
