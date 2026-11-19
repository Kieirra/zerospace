import { useCopy } from '../../hooks/use-copy.ts';
import { HeaderButton } from '../header-button/header-button.tsx';
import { COPY_BO_TEXTS } from './copy-bo-button.constants.ts';

export interface CopyBoButtonProps {
  // The ```bo block of the build, fences included.
  getText: () => string;
  onCopied: () => void;
  onFailed: () => void;
}

// Copies the build as a ```bo block to paste in a guide (D8): the only export of the tool. Off on an empty build.
export const CopyBoButton = ({ isDisabled, getText, onCopied, onFailed }: CopyBoButtonProps & { isDisabled: boolean }) => {
  const { copy } = useCopy();
  return (
    <HeaderButton
      size="text"
      isDisabled={isDisabled}
      tooltip={isDisabled ? COPY_BO_TEXTS.empty : undefined}
      onClick={() => copy(getText()).then((isCopied) => (isCopied ? onCopied() : onFailed()))}
    >
      {COPY_BO_TEXTS.button}
    </HeaderButton>
  );
};
