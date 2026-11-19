// The release that ends a drag is not a click on what lies under the pointer: its click (same task) is dropped;
// nothing is left behind when none comes.
export const swallowNextClick = () => {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
};
