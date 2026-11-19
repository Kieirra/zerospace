import { EditorMessage } from '../editor-message/editor-message.tsx';

interface DataErrorMessageProps {
  onRetry: () => void;
}

export const DataErrorMessage = ({ onRetry }: DataErrorMessageProps) => (
  <EditorMessage text="Game data could not be loaded.">
    <button
      type="button"
      onClick={onRetry}
      className="bevel-sm cursor-pointer bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[#9f3fcc]"
    >
      Retry
    </button>
  </EditorMessage>
);
