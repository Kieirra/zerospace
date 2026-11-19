import { useEffect, useEffectEvent } from 'react';
import { isShortcutBlocked } from '../../hooks/hotkeys.helpers.ts';
import { findTileByHotkey } from '../action-palette.helpers.ts';
import type { RefObject } from 'react';
import type { BuildEntity } from '../../build-order.types.ts';
import type { PaletteTileData } from '../action-palette.helpers.ts';

// In-game hotkeys of the active tab add a step; `/` goes to Find. Ignored while typing or a dialog is open.
// Capture phase: runs before the site-wide shortcuts.
export const usePaletteHotkeys = (
  tiles: PaletteTileData[],
  onAdd: (entity: BuildEntity) => void,
  findRef: RefObject<HTMLInputElement | null>,
) => {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isShortcutBlocked(event)) return;
    if (event.key === '/') {
      // Takes `/` over from the site search on this page.
      event.preventDefault();
      event.stopPropagation();
      findRef.current?.focus();
      return;
    }
    const tile = event.key.length === 1 ? findTileByHotkey(tiles, event.key) : undefined;
    if (!tile) return;
    event.preventDefault();
    onAdd(tile.entity);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener('keydown', listener, { capture: true });
    return () => window.removeEventListener('keydown', listener, { capture: true });
  }, []);
};
