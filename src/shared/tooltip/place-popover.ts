const GAP_PX = 6;
const MARGIN_PX = 8;

// Above the trigger, below it when there is no room, kept inside the window.
export const placePopover = (trigger: HTMLElement, popover: HTMLElement) => {
  const anchor = trigger.getBoundingClientRect();
  const centered = anchor.left + anchor.width / 2 - popover.offsetWidth / 2;
  const above = anchor.top - popover.offsetHeight - GAP_PX;
  popover.style.left = `${Math.max(MARGIN_PX, Math.min(centered, window.innerWidth - popover.offsetWidth - MARGIN_PX))}px`;
  popover.style.top = `${above >= MARGIN_PX ? above : anchor.bottom + GAP_PX}px`;
};
