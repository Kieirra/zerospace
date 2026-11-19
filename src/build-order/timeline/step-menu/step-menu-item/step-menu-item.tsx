interface StepMenuItemProps {
  label: string;
  // Keyboard shortcut of the same action, shown discreetly on the right.
  shortcut: string;
  onSelect: () => void;
}

// The hovered entry takes the focus: one entry highlighted at a time, mouse or arrows.
export const StepMenuItem = ({ label, shortcut, onSelect }: StepMenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    tabIndex={-1}
    onClick={onSelect}
    onMouseEnter={(event) => event.currentTarget.focus({ preventScroll: true })}
    className="flex w-full cursor-pointer items-center justify-between gap-6 px-3 py-1.5 text-left outline-none hover:bg-surface-hover focus:bg-surface-hover"
  >
    {label}
    <span className="text-[11px] text-muted">{shortcut}</span>
  </button>
);
