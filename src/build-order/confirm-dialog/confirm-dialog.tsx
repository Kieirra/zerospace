import { useEffect, useId, useRef } from 'react';
import type { ConfirmRequest } from './hooks/use-confirm.ts';

interface ConfirmDialogProps {
  // null: closed.
  request: ConfirmRequest | null;
  onAnswer: (isConfirmed: boolean) => void;
}

// Native modal dialog (focus kept inside, Escape cancels); the focus goes back where it was on close.
export const ConfirmDialog = ({ request, onAnswer }: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageId = useId();
  const isOpen = request !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onAnswer(false);
      }}
      className="m-auto max-w-md border border-line bg-surface p-6 text-text backdrop:bg-black/70"
    >
      <p id={messageId} className="text-base">
        {request?.message}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onAnswer(false)}
          className="cursor-pointer border border-line bg-panel px-4 py-2 text-sm text-muted hover:text-text"
        >
          {request?.cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => onAnswer(true)}
          className="bevel-sm cursor-pointer bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[#9f3fcc]"
        >
          {request?.confirmLabel}
        </button>
      </div>
    </dialog>
  );
};
