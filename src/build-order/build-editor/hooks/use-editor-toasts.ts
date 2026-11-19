import { useToastMessage } from '../../toast/hooks/use-toast-message.ts';
import { useUndoToast } from './use-undo-toast.ts';
import type { Build } from '../../build-order.types.ts';

// The two toasts of the editor: Undo after a removal or the Reset, and a message (share, paste). A message hides the
// Undo toast.
export const useEditorToasts = (build: Build) => {
  const undoToast = useUndoToast(build);
  const messageToast = useToastMessage();
  const showMessage = (message: string) => {
    undoToast.hide();
    messageToast.show(message);
  };
  return { undoToast, messageToast, showMessage };
};
