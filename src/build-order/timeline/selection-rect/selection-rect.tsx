interface SelectionRectProps {
  // In the coordinates of the lanes zone; null while no rectangle is drawn.
  rect: { left: number; top: number; width: number; height: number } | null;
}

// Rectangle drawn from a press in the void of the lanes: the steps it touches are selected on release.
export const SelectionRect = ({ rect }: SelectionRectProps) =>
  rect === null ? null : (
    <span aria-hidden="true" className="pointer-events-none absolute border border-accent-soft bg-accent/15" style={{ ...rect, zIndex: 14 }} />
  );
