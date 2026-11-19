import { HeaderButton } from '../header-button/header-button.tsx';

export interface HistoryButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

// ↶ / ↷ (Undo, Redo in their tooltip and name), off when there is nothing to undo or redo.
export const HistoryButtons = ({ canUndo, canRedo, onUndo, onRedo }: HistoryButtonsProps) => (
  <div className="flex items-center gap-1">
    <HeaderButton size="icon" isDisabled={!canUndo} label="Undo" onClick={onUndo}>
      <span aria-hidden="true">↶</span>
    </HeaderButton>
    <HeaderButton size="icon" isDisabled={!canRedo} label="Redo" onClick={onRedo}>
      <span aria-hidden="true">↷</span>
    </HeaderButton>
  </div>
);
