import clsx from 'clsx';
import { useTimelineEditing } from '../timeline-editing.ts';
import type { ReactNode } from 'react';
import type { TimelineItem } from '../timeline.types.ts';

interface RemovableMarkProps {
  item: TimelineItem;
  // Place of the mark in its lane.
  left: number;
  top: number;
  // The mark of the step.
  children: ReactNode;
}

// A step mark and its ✕ (Kieirra 2026-11-19), shown on hover or keyboard focus over the right end of the mark, past it
// when the mark is narrower; a click removes the step alone (Undo in the toast), never selects, opens or drags it.
// A copy of a loop has no ✕: it goes with its step.
export const RemovableMark = ({ item, left, top, children }: RemovableMarkProps) => {
  const { onRemove } = useTimelineEditing();
  return (
    <div className="group/mark absolute flex w-max" style={{ left, top }}>
      {children}
      {item.occurrence === 0 && (
        <button
          type="button"
          aria-label={`Delete ${item.label}`}
          // Not a press on the lanes: no drag, no selection rectangle, the step panel stays.
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove([item.stepUid])}
          className={clsx(
            'absolute inset-y-0 left-[max(0px,calc(100%-16px))] z-[5] flex w-4 cursor-pointer items-center justify-center',
            'bg-[#0D0D12]/70 text-[10px] leading-none text-white/70 hover:bg-[#0D0D12] hover:text-white',
            'pointer-events-none opacity-0 group-hover/mark:pointer-events-auto group-hover/mark:opacity-100',
            'group-has-[[data-step-uid]:focus-visible]/mark:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
          )}
        >
          ✕
        </button>
      )}
    </div>
  );
};
