import { useEffect, useEffectEvent } from 'react';
import type { RefObject } from 'react';

interface PanelDismiss {
  onEscape: () => void;
  onPressOutside: () => void;
}

// Escape or a press outside the panel closes it. A press on a mark of the timeline selects that step instead.
export const usePanelDismiss = (panelRef: RefObject<HTMLElement | null>, { onEscape, onPressOutside }: PanelDismiss) => {
  const escape = useEffectEvent(onEscape);
  const pressOutside = useEffectEvent(onPressOutside);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      escape();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (panelRef.current?.contains(event.target) || event.target.closest('[data-step-uid]')) return;
      pressOutside();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [panelRef]);
};
