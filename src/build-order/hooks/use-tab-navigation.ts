import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

const ARROW_STEPS: Partial<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 };

// Tab list (palette, share panel): ← / → select the previous / next tab, looping, and give it the focus.
export const useTabNavigation = <Id extends string>(tabIds: Id[], activeId: Id | undefined, onSelect: (id: Id) => void) => {
  const tabRefs = useRef(new Map<Id, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent) => {
    const step = ARROW_STEPS[event.key];
    const index = activeId === undefined ? -1 : tabIds.indexOf(activeId);
    if (step === undefined || index === -1) return;
    event.preventDefault();
    const next = tabIds[(index + step + tabIds.length) % tabIds.length];
    onSelect(next);
    tabRefs.current.get(next)?.focus();
  };

  const tabRef = (id: Id) => (element: HTMLButtonElement | null) => {
    if (element) tabRefs.current.set(id, element);
  };

  return { onKeyDown, tabRef };
};
