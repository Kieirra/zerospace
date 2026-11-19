import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface PaletteFoldProps {
  // The Add step panel, given the button that folds it, for the top right of its header.
  children: (foldButton: ReactNode) => ReactNode;
}

const PANEL_WIDTH_PX = 336;
const LABEL = 'Add step panel';
const BUTTON_CLASS = 'cursor-pointer font-label text-[10.5px] font-semibold tracking-[.2em] text-muted uppercase hover:text-text';

// Add step panel that folds (Kieirra 2026-11-19), like the Resources group: open by default, state kept for the page
// only. Open, ◂ sits in its header; folded, only a narrow bar stays (▸ Add step) and the timeline takes the room. The
// panel is hidden, never unmounted, so its tab and its Find text stay. The focus goes to the button that replaces the
// one pressed.
export const PaletteFold = ({ children }: PaletteFoldProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const panelId = useId();
  const foldRef = useRef<HTMLButtonElement>(null);
  const unfoldRef = useRef<HTMLButtonElement>(null);
  const hasToggled = useRef(false);

  useEffect(() => {
    if (hasToggled.current) (isExpanded ? foldRef : unfoldRef).current?.focus();
  }, [isExpanded]);

  const toggle = (expanded: boolean) => {
    hasToggled.current = true;
    setIsExpanded(expanded);
  };

  const foldButton = (
    <button
      ref={foldRef}
      type="button"
      aria-expanded={true}
      aria-controls={panelId}
      aria-label={LABEL}
      title="Fold Add step"
      onClick={() => toggle(false)}
      className={`${BUTTON_CLASS} -my-1 px-1.5 py-1`}
    >
      <span aria-hidden="true">◂</span>
    </button>
  );

  return (
    <div className="flex items-start">
      {/* Wide enough for four tiles a row with their price (Kieirra 2026-11-19). */}
      <div id={panelId} hidden={!isExpanded} className="shrink-0" style={{ width: PANEL_WIDTH_PX }}>
        {children(foldButton)}
      </div>
      {!isExpanded && (
        <button
          ref={unfoldRef}
          type="button"
          aria-expanded={false}
          aria-controls={panelId}
          aria-label={LABEL}
          title="Unfold Add step"
          onClick={() => toggle(true)}
          className={`${BUTTON_CLASS} flex items-center gap-2 border border-line bg-panel [writing-mode:vertical-rl]`}
          // Physical: Tailwind's px and py follow the writing mode.
          style={{ padding: '12px 4px' }}
        >
          <span aria-hidden="true" className="[writing-mode:horizontal-tb]">
            ▸
          </span>
          <span aria-hidden="true">Add step</span>
        </button>
      )}
    </div>
  );
};
