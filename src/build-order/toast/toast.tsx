import { useEffect } from 'react';

interface ToastProps {
  message: string;
  // Both or neither: a toast without action only informs.
  actionLabel?: string;
  durationMs: number;
  onAction?: () => void;
  onDismiss: () => void;
}

// Announced message at the bottom of the screen, with one optional action; it leaves by itself.
export const Toast = ({ message, actionLabel, durationMs, onAction, onDismiss }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-4 border-l-[3px] border-[var(--color-heal)] bg-surface-raised px-3.5 py-2.5 text-[13px] shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
    >
      {message}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="cursor-pointer border border-line px-2.5 py-0.5 text-accent-soft hover:bg-surface-hover"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
