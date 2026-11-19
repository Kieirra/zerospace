import { useEffect, useEffectEvent } from 'react';

// Calls onScroll on any scroll of the page or of a scrolling frame (capture), while active.
export const useScrollListener = (isActive: boolean, onScroll: () => void) => {
  const handleScroll = useEffectEvent(onScroll);

  useEffect(() => {
    if (!isActive) return;
    const listener = () => handleScroll();
    window.addEventListener('scroll', listener, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', listener, { capture: true });
  }, [isActive]);
};
