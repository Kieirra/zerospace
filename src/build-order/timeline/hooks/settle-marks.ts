const SETTLE_MS = 150;
const MIN_SHIFT_PX = 1;

// After a drop (Mazar 2026-11-17): the marks of the step slide in 150 ms from where they were let go to where the
// simulation places them. Read once the build is drawn again; nothing moves when the system asks for less motion.
export const settleMarks = (stepUid: string, from: { left: number; top: number }) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  requestAnimationFrame(() => {
    const marks = [...document.querySelectorAll<HTMLElement>(`[data-step-uid="${CSS.escape(stepUid)}"]`)];
    const first = marks.reduce<DOMRect | null>((left, mark) => {
      const rect = mark.getBoundingClientRect();
      return left === null || rect.left < left.left ? rect : left;
    }, null);
    if (!first) return;
    const dx = from.left - first.left;
    const dy = from.top - first.top;
    if (Math.abs(dx) < MIN_SHIFT_PX && Math.abs(dy) < MIN_SHIFT_PX) return;
    for (const mark of marks) {
      mark.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: SETTLE_MS, easing: 'ease-out' });
    }
  });
};
