import clsx from 'clsx';

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
  // Icon of the chosen value, left of its name (Kieirra 2026-11-19); none: no room kept for it.
  imageUrl?: string;
  onChange: (value: string) => void;
}

// Header drop-down menu (faction, mercenary or setup hero). A native select shows no image: the icon sits over the
// field, the text starts after it.
export const SideSelect = ({ label, value, options, accent, imageUrl, onChange }: SideSelectProps) => (
  <span className="relative inline-flex items-center">
    {imageUrl && (
      <img src={imageUrl} alt="" width={16} height={16} className="pointer-events-none absolute left-[9px] size-4 object-contain" />
    )}
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{ borderLeftColor: accent }}
      className={clsx(
        'label-caps cursor-pointer border border-l-[3px] border-line bg-surface py-1.5 pr-2 text-[11px] tracking-[.08em] hover:bg-surface-hover',
        imageUrl ? 'pl-[30px]' : 'pl-2',
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.isDisabled}>
          {option.label}
        </option>
      ))}
    </select>
  </span>
);
