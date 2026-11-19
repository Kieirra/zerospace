import clsx from 'clsx';
import { useId, useRef, useState } from 'react';
import { useTabNavigation } from '../hooks/use-tab-navigation.ts';
import { filterTiles, toDefaultTabId, toPaletteTabs } from './action-palette.helpers.ts';
import { usePaletteHotkeys } from './hooks/use-palette-hotkeys.ts';
import { PaletteGrid } from './palette-grid/palette-grid.tsx';
import type { Build, BuildEntity } from '../build-order.types.ts';
import type { PaletteContext, PaletteTabId } from './action-palette.helpers.ts';

interface ActionPaletteProps {
  build: Build;
  context: PaletteContext;
  // Room taken by the sticky header above it.
  stickyTop: number;
  onAdd: (entity: BuildEntity) => void;
}

const STICKY_GAP_PX = 8;
// Page around the palette at rest: main top padding and gap above it (40), main bottom padding and footer below it (56).
// Kept out of its height so a long list never makes the page scroll (Kieirra 2026-11-19).
const RESTING_CHROME_PX = 96;

// 'Add step': Find across every tab, or the tiles of the active tab (kept for the page) and its hotkeys.
// Only the tiles scroll (Kieirra 2026-11-19), title, Find and tabs stay on top, the page never scrolls with them. Gutter
// kept so the tiles never shift when a long tab brings the scrollbar, set in the right padding; thin thumb.
export const ActionPalette = ({ build, context, stickyTop, onAdd }: ActionPaletteProps) => {
  const [activeTabId, setActiveTabId] = useState<PaletteTabId>(() => toDefaultTabId(build));
  const [query, setQuery] = useState('');
  const findRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const tabs = toPaletteTabs(build, context);
  const activeTab = tabs.find(({ id }) => id === activeTabId) ?? tabs[0];
  const results = query.trim() === '' ? null : filterTiles(tabs, query);
  usePaletteHotkeys(activeTab?.tiles ?? [], onAdd, findRef);
  const tabNavigation = useTabNavigation(
    tabs.map(({ id }) => id),
    activeTab?.id,
    setActiveTabId,
  );

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="sticky flex flex-col gap-2.5 self-start overflow-hidden border border-line bg-panel p-3"
      style={{ top: stickyTop + STICKY_GAP_PX, maxHeight: `calc(100dvh - ${stickyTop + RESTING_CHROME_PX}px)` }}
    >
      <div className="flex shrink-0 items-baseline justify-between">
        <h2 id={`${baseId}-title`} className="label-caps text-xs">
          Add step
        </h2>
      </div>
      <input
        ref={findRef}
        type="search"
        aria-label="Find a step"
        placeholder="Find…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
        className="h-[30px] shrink-0 border border-line bg-bg px-2.5 text-[12.5px] placeholder:text-muted"
      />
      {results ? (
        <div
          className={clsx(
            '-mr-2.5 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]',
            '[scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent]',
            '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-line [&::-webkit-scrollbar-track]:bg-transparent',
            'flex flex-col gap-3',
          )}
        >
          {results.length === 0 && <p className="text-[12px] text-muted">Nothing matches “{query.trim()}”.</p>}
          {results.map((tab) => (
            <div key={tab.id} className="flex flex-col gap-1.5">
              <h3 className="label-caps text-[10px] text-muted">{tab.label}</h3>
              <PaletteGrid tiles={tab.tiles} onAdd={onAdd} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div role="tablist" aria-labelledby={`${baseId}-title`} onKeyDown={tabNavigation.onKeyDown} className="flex shrink-0 flex-wrap gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                ref={tabNavigation.tabRef(tab.id)}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={tab.id === activeTab?.id}
                aria-controls={`${baseId}-panel`}
                tabIndex={tab.id === activeTab?.id ? 0 : -1}
                onClick={() => setActiveTabId(tab.id)}
                className={clsx(
                  'cursor-pointer border-b-2 px-2 py-1 text-[12px]',
                  tab.id === activeTab?.id ? 'border-[#AEB9CC] text-text' : 'border-transparent text-muted hover:text-text',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab && (
            // A new tab opens at its first row.
            <div
              key={activeTab.id}
              id={`${baseId}-panel`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${activeTab.id}`}
              className={clsx(
                '-mr-2.5 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]',
                '[scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent]',
                '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-line [&::-webkit-scrollbar-track]:bg-transparent',
              )}
            >
              <PaletteGrid tiles={activeTab.tiles} onAdd={onAdd} />
            </div>
          )}
        </>
      )}
    </section>
  );
};
