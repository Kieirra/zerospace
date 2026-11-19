import { useCallback, useState } from 'react';

interface ToastMessage {
  // New for each show: the same message shown again restarts its timer.
  id: number;
  message: string;
}

export const useToastMessage = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const show = useCallback(
    (message: string) => setToast((current) => ({ id: (current?.id ?? 0) + 1, message })),
    [],
  );
  // Stable: the toast timer restarts when onDismiss changes.
  const hide = useCallback(() => setToast(null), []);
  return { toast, show, hide };
};
