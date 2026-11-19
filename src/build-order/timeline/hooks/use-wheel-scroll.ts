import { useEffect } from 'react';
import { toWheelScrollLeft } from './use-wheel-scroll.helpers.ts';
import type { RefObject } from 'react';

// The vertical wheel scrolls the frame sideways while it has a horizontal scrollbar (Kieirra 2026-11-19), else the page.
// Native listener: React's onWheel is passive, its preventDefault would not keep the page still.
export const useWheelScroll = (frameRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const handleWheel = (event: WheelEvent) => {
      const scrollLeft = toWheelScrollLeft(event, frame);
      if (scrollLeft === null) return;
      event.preventDefault();
      frame.scrollLeft = scrollLeft;
    };
    frame.addEventListener('wheel', handleWheel, { passive: false });
    return () => frame.removeEventListener('wheel', handleWheel);
  }, [frameRef]);
};
