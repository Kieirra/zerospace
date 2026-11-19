import { useEffect, useEffectEvent } from 'react';
import { isShortcutBlocked } from '../../hooks/hotkeys.helpers.ts';
import { toEditorShortcut } from './use-editor-shortcuts.helpers.ts';
import type { EditorShortcut } from './use-editor-shortcuts.helpers.ts';

// null while the shortcut has nothing to act on (no selection, empty clipboard): the key is left to the browser.
type EditorShortcuts = Record<EditorShortcut, (() => void) | null>;

// Delete, Backspace, Ctrl/Cmd + C, V, D and Escape on the selection. Never shown in the interface (Kieirra 2026-11-19).
export const useEditorShortcuts = (shortcuts: EditorShortcuts) => {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const shortcut = toEditorShortcut(event);
    if (shortcut === null || event.defaultPrevented || isShortcutBlocked(event)) return;
    // Never a browser bookmark here, even with nothing to duplicate.
    if (shortcut === 'duplicate') event.preventDefault();
    const run = shortcuts[shortcut];
    if (run === null || event.repeat) return;
    event.preventDefault();
    run();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
};
