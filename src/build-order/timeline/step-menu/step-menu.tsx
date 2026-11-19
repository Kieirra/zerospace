import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTimelineEditing } from '../timeline-editing.ts';
import { useMenuDismiss } from './hooks/use-menu-dismiss.ts';
import { toMenuPosition } from './step-menu.helpers.ts';
import { StepMenuItem } from './step-menu-item/step-menu-item.tsx';
import type { KeyboardEvent } from 'react';
import type { StepMenuRequest } from '../hooks/use-step-menu.ts';

interface StepMenuProps {
  request: StepMenuRequest;
  onClose: () => void;
}

const FOCUS_STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

// Menu of the right-clicked steps (Kieirra 2026-11-19): Duplicate and Delete, the very actions of Ctrl+D and Delete.
// Kept in the window; the first entry takes the focus, arrows move it, Tab leaves the menu.
export const StepMenu = ({ request, onClose }: StepMenuProps) => {
  const { onDuplicate, onRemove } = useTimelineEditing();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const isPlaced = position !== null;
  const closeToMark = () => {
    onClose();
    if (request.mark.isConnected) request.mark.focus({ preventScroll: true });
  };
  useMenuDismiss(ref, { onEscape: closeToMark, onDismiss: onClose });

  useLayoutEffect(() => {
    const menu = ref.current?.getBoundingClientRect();
    if (menu) setPosition(toMenuPosition(request.pointer, menu, { width: window.innerWidth, height: window.innerHeight }));
  }, [request]);
  // Once placed: a hidden menu cannot take the focus.
  useEffect(() => {
    if (isPlaced) ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [isPlaced]);

  const run = (command: (stepUids: string[]) => void) => {
    command(request.uids);
    closeToMark();
  };
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') onClose();
    const step = FOCUS_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const index = items.findIndex((item) => item === document.activeElement);
    items[(index + step + items.length) % items.length]?.focus();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Step actions"
      onKeyDown={moveFocus}
      className="fixed z-[65] min-w-40 border border-line bg-panel py-1 text-[12px] shadow-lg shadow-black/60"
      style={{ ...(position ?? { left: request.pointer.x, top: request.pointer.y }), visibility: isPlaced ? undefined : 'hidden' }}
    >
      <StepMenuItem label="Duplicate" shortcut="Ctrl+D" onSelect={() => run(onDuplicate)} />
      <StepMenuItem label="Delete" shortcut="Del" onSelect={() => run(onRemove)} />
    </div>
  );
};
