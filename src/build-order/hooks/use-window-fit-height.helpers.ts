// Height an element may take from `top` (in the page) so that it and `bottomPx` under it fit the window, `minPx` at
// least: on a short window the page scrolls rather than the element shrinking to nothing.
export const toWindowFitHeight = (windowHeight: number, top: number, bottomPx: number, minPx: number) =>
  Math.max(minPx, Math.floor(windowHeight - top - bottomPx));
