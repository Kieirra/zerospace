export const MIN_TIMELINE_SECONDS = 60;
// Ruler (Kieirra 2026-11-19): 'm:ss' every 30 s, every minute when 30 s is narrower than AXIS_LABEL_MIN_PX; a small
// tick every 10 s, every 30 s when 10 s is narrower than AXIS_TICK_MIN_PX.
export const AXIS_LABEL_SECONDS = 30;
export const AXIS_WIDE_LABEL_SECONDS = 60;
export const AXIS_LABEL_MIN_PX = 40;
export const AXIS_TICK_SECONDS = 10;
export const AXIS_TICK_MIN_PX = 4;
// Room after the last end before rounding the axis up.
export const END_MARGIN_SECONDS = 5;
// Longest span fitted to the frame width; past it this span stays visible and the frame scrolls (Kieirra 2026-11-19).
export const VISIBLE_SECONDS = 180;
export const WAIT_LABEL_MIN_SECONDS = 6;

// Frame width before the first measure.
export const FALLBACK_FRAME_PX = 1100;
export const LABEL_COLUMN_PX = 120;
// 'queued 0:14', 'stacks ?/4', 'peak 685' on the right, fixed while scrolling.
export const RIGHT_LABEL_COLUMN_PX = 92;
// Height of TimelineAxis (h-[22px]).
export const AXIS_HEIGHT_PX = 22;
export const CURVE_HEIGHT_PX = 40;
// Room on the right for the last axis label.
export const TRACK_END_PADDING_PX = 32;
export const BAR_LABEL_MIN_PX = 48;
// Smallest bar (Kieirra 2026-11-19): its icon, the start of its name and room to click it, beside its ✕.
export const MIN_CHIP_PX = 64;
// Height of a point mark (h-5).
export const MARK_PX = 20;
// Horizontal room taken by a point mark (recruit, Misc step) and its label, kept free when stacking rows.
export const POINT_MARK_PX = 120;
// Room taken by the point of a free unit and its icon (US-008).
export const FREE_UNIT_MARK_PX = 24;
// Room taken by the count of free units made at once ('6'), right of their icon.
export const FREE_UNIT_COUNT_PX = 18;
// Width of the ✕ of a mark (w-4), kept free at the right end of a point mark.
export const REMOVE_BUTTON_PX = 16;

// Pointer tip of the click icon: (7, 7) in its 20 × 20 box.
export const CLICK_TIP_RATIO = 7 / 20;
export const CLICK_ICON_PX = 24;

export const TIMELINE_BACKGROUND = '#0D0D12';
// Ghost, line and label of a drop.
export const DROP_COLOR = '#c8b6ff';

export const SETUP_HERO_KEY = 'setup-hero';

// Arrow keys move the time cursor by this step.
export const CURSOR_KEY_STEP_SECONDS = 5;
