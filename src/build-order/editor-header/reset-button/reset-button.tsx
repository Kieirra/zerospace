import { HeaderButton } from '../header-button/header-button.tsx';

interface ResetButtonProps {
  isDisabled: boolean;
  onReset: () => void;
}

// Empties the build, sides, hero, title and author kept; no confirmation, the toast offers Undo.
export const ResetButton = ({ isDisabled, onReset }: ResetButtonProps) => (
  <HeaderButton size="text" isDisabled={isDisabled} onClick={onReset}>
    ↺ Reset
  </HeaderButton>
);
