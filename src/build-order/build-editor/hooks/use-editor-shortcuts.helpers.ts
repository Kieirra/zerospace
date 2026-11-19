export type EditorShortcut = 'remove' | 'copy' | 'paste' | 'duplicate' | 'clear';

// Delete or Backspace removes, Ctrl/Cmd + C, V, D copy, paste, duplicate, Escape clears the selection
// (Kieirra 2026-11-19). Alt is left to the browser; Ctrl/Cmd + Shift belongs to redo.
export const toEditorShortcut = (event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>) => {
  if (event.altKey) return null;
  if (!(event.ctrlKey || event.metaKey)) {
    if (event.key === 'Delete' || event.key === 'Backspace') return 'remove';
    return event.key === 'Escape' ? 'clear' : null;
  }
  if (event.shiftKey) return null;
  return COMMAND_SHORTCUTS[event.key.toLowerCase()] ?? null;
};

const COMMAND_SHORTCUTS: Record<string, EditorShortcut> = { c: 'copy', v: 'paste', d: 'duplicate' };
