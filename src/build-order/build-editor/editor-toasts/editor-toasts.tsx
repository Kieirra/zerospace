import { SHARE_TOAST_MS } from '../../editor-header/share-button/share-button.constants.ts';
import { Toast } from '../../toast/toast.tsx';
import type { useEditorToasts } from '../hooks/use-editor-toasts.ts';

interface EditorToastsProps {
  toasts: ReturnType<typeof useEditorToasts>;
  onUndo: () => void;
}

const UNDO_TOAST_MS = 5000;

// The Undo toast goes first: a message shows only while there is none.
export const EditorToasts = ({ toasts, onUndo }: EditorToastsProps) => {
  const { undoToast, messageToast } = toasts;
  if (undoToast.toastId !== null) {
    return (
      <Toast
        key={undoToast.toastId}
        message={undoToast.message}
        actionLabel="Undo"
        durationMs={UNDO_TOAST_MS}
        onAction={onUndo}
        onDismiss={undoToast.hide}
      />
    );
  }
  if (messageToast.toast === null) return null;
  return <Toast key={messageToast.toast.id} message={messageToast.toast.message} durationMs={SHARE_TOAST_MS} onDismiss={messageToast.hide} />;
};
