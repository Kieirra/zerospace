import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// When the panel closes with the focus in it (Escape, ✕, Remove), keyboard users go on from the timeline: the first
// mark of the step, or the timeline itself when the step is gone. A focus already elsewhere (a click) is left there.
export const useFocusReturn = (panelRef: RefObject<HTMLElement | null>, stepUid: string) => {
  const lastStepUid = useRef(stepUid);
  lastStepUid.current = stepUid;

  useEffect(() => {
    const panel = panelRef.current;
    return () => {
      const isFocusLost = document.activeElement === document.body || panel?.contains(document.activeElement);
      if (!isFocusLost) return;
      const target = findFirstMark(lastStepUid.current) ?? document.querySelector<HTMLElement>('[data-timeline-zone]');
      target?.focus();
    };
  }, [panelRef]);
};

const findFirstMark = (stepUid: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-step-uid="${CSS.escape(stepUid)}"]`)].reduce<HTMLElement | null>(
    (first, mark) => (first === null || mark.getBoundingClientRect().left < first.getBoundingClientRect().left ? mark : first),
    null,
  );
