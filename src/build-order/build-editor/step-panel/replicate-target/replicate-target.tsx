import { useId } from 'react';
import type { BuildEntity } from '../../../build-order.types.ts';

interface ReplicateTargetProps {
  entityId: string;
  options: BuildEntity[];
  onChange: (entityId: string) => void;
}

// 'Target' of a Replicate copy (US-009): the unit it copies, styled as Made in.
export const ReplicateTarget = ({ entityId, options, onChange }: ReplicateTargetProps) => {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-16 shrink-0 text-muted">
        Target
      </label>
      <select
        id={id}
        value={entityId}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer border border-line bg-surface px-2 py-1 hover:bg-surface-hover"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName}
          </option>
        ))}
      </select>
    </div>
  );
};
