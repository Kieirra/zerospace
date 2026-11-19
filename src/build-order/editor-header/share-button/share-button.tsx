import { useCopy } from '../../hooks/use-copy.ts';
import { SHARE_TEXTS } from './share-button.constants.ts';

export interface ShareButtonProps {
  getUrl: () => string;
  onCopied: () => void;
  onFailed: () => void;
}

// Copies the address of the build: the link is the build, nothing else to open.
export const ShareButton = ({ getUrl, onCopied, onFailed }: ShareButtonProps) => {
  const { copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(getUrl()).then((isCopied) => (isCopied ? onCopied() : onFailed()))}
      className="cursor-pointer border border-line bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
    >
      {SHARE_TEXTS.button}
    </button>
  );
};
