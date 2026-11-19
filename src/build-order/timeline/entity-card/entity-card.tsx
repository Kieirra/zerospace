import { useEffect, useEffectEvent, useRef } from 'react';
import { EntityIcon } from '../../entity-icon/entity-icon.tsx';
import { WikiLink } from '../../wiki-link/wiki-link.tsx';
import type { ReactNode } from 'react';
import type { BuildEntity } from '../../build-order.types.ts';

interface EntityCardProps {
  entity: BuildEntity;
  // Viewport rectangle of the clicked mark.
  anchor: DOMRect;
  // Cost and time line.
  facts: ReactNode;
  onClose: () => void;
}

const GAP_PX = 8;
const CARD_WIDTH_PX = 256;
const MARGIN_PX = 8;

// Small card under the clicked mark; Escape or a click elsewhere closes it.
export const EntityCard = ({ entity, anchor, facts, onClose }: EntityCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const card = ref.current;
    const opener = document.activeElement;
    card?.focus();
    // Handled here: the same Escape closes nothing else.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      // Focus was in the removed card (Escape): keyboard users get back to the mark they opened.
      const isFocusLost = document.activeElement === document.body || card?.contains(document.activeElement);
      if (isFocusLost && opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  const left = Math.min(Math.max(MARGIN_PX, anchor.left), window.innerWidth - CARD_WIDTH_PX - MARGIN_PX);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={entity.displayName}
      tabIndex={-1}
      className="fixed z-40 flex flex-col gap-2 border border-[#3b3a44] bg-surface-raised p-3 text-sm shadow-lg shadow-black/60 outline-none"
      style={{ left, top: anchor.bottom + GAP_PX, width: CARD_WIDTH_PX }}
    >
      <p className="flex items-center gap-2 font-semibold">
        <EntityIcon entity={entity} />
        {entity.displayName}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs">{facts}</div>
      <WikiLink entityId={entity.id} />
    </div>
  );
};
