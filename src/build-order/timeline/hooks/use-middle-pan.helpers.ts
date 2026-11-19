// Pointer and scroll of the frame when the wheel button was pressed.
export interface PanStart {
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
}

// Scroll of the frame while panning with the wheel button held (Kieirra 2026-11-19): the lanes follow the pointer, in
// both directions. The browser holds the values within the scroll range.
export const toPanScroll = (start: PanStart, pointer: { x: number; y: number }) => ({
  left: start.scrollLeft - (pointer.x - start.x),
  top: start.scrollTop - (pointer.y - start.y),
});
