import { useEffect, useEffectEvent, useLayoutEffect, useState } from 'react';
import { toWindowFitHeight } from './use-window-fit-height.helpers.ts';
import type { RefObject } from 'react';

// Max height of an element that keeps the page from scrolling (Kieirra 2026-11-19): from where it sits in the page to
// the bottom of the window, `bottomPx` left under it. Measured after every render (a banner above moves it) and on
// resize; a hidden element keeps its last value. null until measured.
export const useWindowFitHeight = (ref: RefObject<HTMLElement | null>, bottomPx: number, minPx: number) => {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const measure = useEffectEvent(() => {
    const element = ref.current;
    if (!element || element.offsetParent === null) return;
    const top = element.getBoundingClientRect().top + window.scrollY;
    setMaxHeight(toWindowFitHeight(window.innerHeight, top, bottomPx, minPx));
  });

  useLayoutEffect(() => measure());

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return maxHeight;
};
