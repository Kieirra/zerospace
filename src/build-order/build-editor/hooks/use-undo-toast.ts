import { useCallback, useState } from 'react';
import type { Build } from '../../build-order.types.ts';

interface Change {
  id: number;
  message: string;
  // Build right after the change; null until the render that follows it.
  build: Build | null;
}

// Toast to undo the last removal or the Reset, hidden by any later change of the build (edit, undo, redo).
export const useUndoToast = (build: Build) => {
  const [change, setChange] = useState<Change | null>(null);
  if (change !== null && change.build === null) {
    setChange({ ...change, build });
  } else if (change?.build && change.build !== build) {
    setChange(null);
  }
  const show = useCallback(
    (message: string) => setChange((current) => ({ id: (current?.id ?? 0) + 1, message, build: null })),
    [],
  );
  const hide = useCallback(() => setChange(null), []);
  return { toastId: change?.id ?? null, message: change?.message ?? '', show, hide };
};
