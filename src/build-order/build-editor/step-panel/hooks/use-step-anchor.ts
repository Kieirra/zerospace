import { useEffect, useState } from 'react';

// Viewport rectangle of the first mark of a step on the timeline, followed every frame while a step is selected:
// the step moves when it is simulated again or when the timeline scrolls. Without a mark the last rectangle is kept.
export const useStepAnchor = (stepUid: string | null) => {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (stepUid === null) return;
    let request = 0;
    const follow = () => {
      const rect = findFirstMarkRect(stepUid);
      if (rect) setAnchor((previous) => (previous && isSameRect(previous, rect) ? previous : rect));
      request = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(request);
  }, [stepUid]);

  return stepUid === null ? null : anchor;
};

const findFirstMarkRect = (stepUid: string) => {
  const marks = [...document.querySelectorAll(`[data-step-uid="${CSS.escape(stepUid)}"]`)].map((mark) => mark.getBoundingClientRect());
  if (marks.length === 0) return null;
  return marks.reduce((first, rect) => (rect.left < first.left ? rect : first));
};

const isSameRect = (a: DOMRect, b: DOMRect) => a.left === b.left && a.top === b.top && a.bottom === b.bottom;
