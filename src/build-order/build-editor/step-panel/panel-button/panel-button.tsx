import type { ReactNode } from 'react';

interface PanelButtonProps {
  title: string;
  onClick: () => void;
  children: ReactNode;
}

export const PanelButton = ({ title, onClick, children }: PanelButtonProps) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="cursor-pointer border border-line bg-surface px-2.5 py-1 text-[12.5px] hover:bg-surface-hover"
  >
    {children}
  </button>
);
