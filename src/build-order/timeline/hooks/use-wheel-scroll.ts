import { useEffect } from 'react';
import { toShiftWheelScrollLeft } from './use-wheel-scroll.helpers.ts';
import type { RefObject } from 'react';

// The wheel scrolls the lanes up and down and a trackpad both ways, as the browser does; Shift + wheel scrolls the
// frame sideways (Kieirra 2026-11-19). Native listener: React's onWheel is passive, its preventDefault would not keep
// the browser from scrolling too.
export const useWheelScroll = (frameRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const handleWheel = (event: WheelEvent) => {
      const scrollLeft = toShiftWheelScrollLeft(event, frame);
      if (scrollLeft === null) return;
      event.preventDefault();
      frame.scrollLeft = scrollLeft;
    };
    frame.addEventListener('wheel', handleWheel, { passive: false });
    return () => frame.removeEventListener('wheel', handleWheel);
  }, [frameRef]);
};
