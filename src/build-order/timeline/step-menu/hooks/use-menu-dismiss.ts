import { useEffect, useEffectEvent } from 'react';
import { useScrollListener } from '../../../hooks/use-scroll-listener.ts';
import type { RefObject } from 'react';

interface MenuDismiss {
  onEscape: () => void;
  // A press outside the menu or a scroll.
  onDismiss: () => void;
}

// Escape, a press outside the menu or any scroll closes it.
export const useMenuDismiss = (menuRef: RefObject<HTMLElement | null>, { onEscape, onDismiss }: MenuDismiss) => {
  const escape = useEffectEvent(onEscape);
  const dismiss = useEffectEvent(onDismiss);
  useScrollListener(true, onDismiss);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      escape();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !menuRef.current?.contains(event.target)) dismiss();
    };
    // Capture: before the step panel and the editor shortcuts, this Escape only closes the menu.
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [menuRef]);
};
