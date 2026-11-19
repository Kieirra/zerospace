import { useId } from 'react';
import type { MadeInOption } from './made-in-select.helpers.ts';

interface MadeInSelectProps {
  // undefined: Auto.
  producerUid?: string;
  // Capable lanes, in lane order.
  options: MadeInOption[];
  onChange: (producerUid?: string) => void;
}

// 'Made in' of the step panel (Kieirra 2026-11-19): a lane pins the step on it, Auto lets the engine choose.
export const MadeInSelect = ({ producerUid, options, onChange }: MadeInSelectProps) => {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-16 shrink-0 text-muted">
        Made in
      </label>
      <select
        id={id}
        value={producerUid ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
        className="cursor-pointer border border-line bg-surface px-2 py-1 hover:bg-surface-hover"
      >
        <option value="">Auto</option>
        {options.map(({ uid, label }) => (
          <option key={uid} value={uid}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
};
