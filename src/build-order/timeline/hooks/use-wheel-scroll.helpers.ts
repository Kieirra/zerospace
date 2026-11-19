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

// New scrollLeft of the frame for a vertical wheel turn (Kieirra 2026-11-19), null when the page keeps the wheel: no
// horizontal scrollbar, already at the end it goes to, a sideways scroll the browser handles (trackpad, Shift + wheel)
// or a Ctrl + wheel zoom.
export const toWheelScrollLeft = (wheel: WheelInput, frame: FrameScroll) => {
  if (wheel.shiftKey || wheel.ctrlKey || Math.abs(wheel.deltaX) >= Math.abs(wheel.deltaY)) return null;
  const maxLeft = frame.scrollWidth - frame.clientWidth;
  if (maxLeft <= 0) return null;
  const delta = wheel.deltaY * toUnitPx(wheel.deltaMode, frame.clientWidth);
  const isAtEnd = delta < 0 ? frame.scrollLeft <= 0 : frame.scrollLeft >= maxLeft - 1;
  return isAtEnd ? null : Math.min(Math.max(frame.scrollLeft + delta, 0), maxLeft);
};

// WheelEvent.deltaMode: 0 pixels, 1 lines, 2 pages.
const toUnitPx = (deltaMode: number, pagePx: number) => {
  if (deltaMode === 1) return LINE_PX;
  return deltaMode === 2 ? pagePx : 1;
};
