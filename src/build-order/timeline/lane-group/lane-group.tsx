import { useState } from 'react';
import type { ReactNode } from 'react';

interface LaneGroupProps {
  label: string;
  color: string;
  children: ReactNode;
}

// Group of lanes with a header that folds it; open by default, state kept for the page only.
export const LaneGroup = ({ label, color, children }: LaneGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <div>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="sticky left-0 flex cursor-pointer items-center gap-2 px-4 pt-3 pb-1 font-label text-[10.5px] font-semibold tracking-[.2em] uppercase hover:brightness-125"
        style={{ color }}
      >
        <span aria-hidden="true" className="inline-block w-2 text-[9px]">
          {isExpanded ? '▾' : '▸'}
        </span>
        {label}
      </button>
      {isExpanded && children}
    </div>
  );
};
