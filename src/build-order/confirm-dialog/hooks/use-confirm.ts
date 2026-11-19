import { useCallback, useState } from 'react';

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (isConfirmed: boolean) => void;
}

// One question at a time: `ask` resolves true on confirm, false on cancel or Escape.
export const useConfirm = () => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  // Stable: also asked from the loading effect.
  const ask = useCallback(
    (request: ConfirmRequest) => new Promise<boolean>((resolve) => setPending({ ...request, resolve })),
    [],
  );

  const answer = (isConfirmed: boolean) => {
    pending?.resolve(isConfirmed);
    setPending(null);
  };

  return { request: pending, ask, answer };
};
