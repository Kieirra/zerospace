// Pixels a wheel line moves when the browser counts the wheel in lines (Firefox); a page is the frame's width.
const LINE_PX = 40;

interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
  ctrlKey: boolean;
}

interface FrameScroll {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}

// New scrollLeft of the frame for Shift + wheel (Kieirra 2026-11-19), null when the browser keeps the wheel: no Shift
// (the wheel scrolls the lanes up and down, a trackpad both ways), a Ctrl + wheel zoom, no horizontal scrollbar or
// already at the end it goes to. The browser may give Shift + wheel as a sideways turn: the larger delta counts.
export const toShiftWheelScrollLeft = (wheel: WheelInput, frame: FrameScroll) => {
  if (!wheel.shiftKey || wheel.ctrlKey) return null;
  const maxLeft = frame.scrollWidth - frame.clientWidth;
  if (maxLeft <= 0) return null;
  const turn = Math.abs(wheel.deltaY) >= Math.abs(wheel.deltaX) ? wheel.deltaY : wheel.deltaX;
  const delta = turn * toUnitPx(wheel.deltaMode, frame.clientWidth);
  const isAtEnd = delta < 0 ? frame.scrollLeft <= 0 : frame.scrollLeft >= maxLeft - 1;
  return isAtEnd ? null : Math.min(Math.max(frame.scrollLeft + delta, 0), maxLeft);
};

// WheelEvent.deltaMode: 0 pixels, 1 lines, 2 pages.
const toUnitPx = (deltaMode: number, pagePx: number) => {
  if (deltaMode === 1) return LINE_PX;
  return deltaMode === 2 ? pagePx : 1;
};
