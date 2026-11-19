interface Size {
  width: number;
  height: number;
}

const MARGIN_PX = 4;

// At the pointer, flipped to its left or above it when it would leave the window, never past the window's top-left.
export const toMenuPosition = (pointer: { x: number; y: number }, menu: Size, viewport: Size) => ({
  left: toStart(pointer.x, menu.width, viewport.width),
  top: toStart(pointer.y, menu.height, viewport.height),
});

const toStart = (at: number, size: number, room: number) => (at + size <= room - MARGIN_PX ? at : Math.max(MARGIN_PX, at - size));
