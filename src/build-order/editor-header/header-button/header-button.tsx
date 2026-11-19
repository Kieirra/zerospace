import clsx from 'clsx';
import type { ReactNode } from 'react';

interface HeaderButtonProps {
  // icon: one glyph (Undo, Redo); text: a word (Reset).
  size: 'icon' | 'text';
  isDisabled: boolean;
  onClick: () => void;
  // Tooltip and accessible name of a glyph.
  label?: string;
  children: ReactNode;
}

// Undo, Redo and Reset: off when there is nothing to do.
export const HeaderButton = ({ size, isDisabled, onClick, label, children }: HeaderButtonProps) => (
  <button
    type="button"
    disabled={isDisabled}
    title={label}
    aria-label={label}
    onClick={onClick}
    className={clsx(
      'cursor-pointer border border-line bg-surface py-1.5 text-sm hover:bg-surface-hover',
      'disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surface',
      size === 'icon' && 'px-2.5',
      size === 'text' && 'px-3',
    )}
  >
    {children}
  </button>
);
