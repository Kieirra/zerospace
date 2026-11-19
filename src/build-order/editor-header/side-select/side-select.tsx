export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

interface SideSelectProps {
  // Read by screen readers only: the chosen value says what the menu is.
  label: string;
  value: string;
  options: SelectOption[];
  // Faction or mercenary color on the left edge.
  accent?: string;
  onChange: (value: string) => void;
}

// Header drop-down menu (faction, mercenary or setup hero).
export const SideSelect = ({ label, value, options, accent, onChange }: SideSelectProps) => (
  <select
    aria-label={label}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    style={{ borderLeftColor: accent }}
    className="label-caps cursor-pointer border border-l-[3px] border-line bg-surface px-2 py-1.5 text-[11px] tracking-[.08em] hover:bg-surface-hover"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value} disabled={option.isDisabled}>
        {option.label}
      </option>
    ))}
  </select>
);
