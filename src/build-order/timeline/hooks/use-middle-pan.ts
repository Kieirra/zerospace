import { useEffect, useState } from 'react';
import { toPanScroll } from './use-middle-pan.helpers.ts';
import type { RefObject } from 'react';

const WHEEL_BUTTON = 1;

// Wheel button held then moved (Kieirra 2026-11-19): the frame pans in both directions, the lanes following the
// pointer, until the button is released. The browser's own autoscroll never starts. Native listeners: the default of
// the mouse press is what starts the autoscroll.
export const useMiddlePan = (frameRef: RefObject<HTMLElement | null>) => {
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let stop: (() => void) | null = null;
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== WHEEL_BUTTON || stop) return;
      event.preventDefault();
      const start = { x: event.clientX, y: event.clientY, scrollLeft: frame.scrollLeft, scrollTop: frame.scrollTop };
      const onMouseMove = (moveEvent: MouseEvent) => {
        const { left, top } = toPanScroll(start, { x: moveEvent.clientX, y: moveEvent.clientY });
        frame.scrollLeft = left;
        frame.scrollTop = top;
      };
      const onMouseUp = (upEvent: MouseEvent) => {
        if (upEvent.button === WHEEL_BUTTON) stop?.();
      };
      stop = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        stop = null;
        setIsPanning(false);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      setIsPanning(true);
    };
    frame.addEventListener('mousedown', onMouseDown);
    return () => {
      frame.removeEventListener('mousedown', onMouseDown);
      stop?.();
    };
  }, [frameRef]);

  return isPanning;
};
