import { useState } from 'react';
import { toClipboardSteps } from '../build-editor.clipboard.ts';
import { BUILD_FULL_TEXT } from '../build-editor.constants.ts';
import { editorReducer } from '../build-editor.reducer.ts';
import type { Dispatch } from 'react';
import type { Build, BuildCatalog } from '../../build-order.types.ts';
import type { ClipboardSteps, PasteTarget } from '../build-editor.clipboard.ts';
import type { EditorAction, EditorState } from '../build-editor.reducer.ts';

interface BuildClipboardOptions {
  state: EditorState & { build: Build };
  // Entities of the build: the copies are checked against them (rules, no unit without a building).
  catalog: BuildCatalog;
  dispatch: Dispatch<EditorAction>;
  // The copies pasted or duplicated: they become the selection.
  onAdded: (uids: string[]) => void;
  onMessage: (text: string) => void;
}

// Ctrl+C keeps the selected steps in memory, never in the system clipboard; Ctrl+V pastes them, Ctrl+D duplicates the
// selection in place (Kieirra 2026-11-19). The editor state the reducer gives says what was added, skipped or refused.
export const useBuildClipboard = ({ state, catalog, dispatch, onAdded, onMessage }: BuildClipboardOptions) => {
  const [clip, setClip] = useState<ClipboardSteps | null>(null);

  const apply = (action: EditorAction) => {
    const next = editorReducer(state, action);
    dispatch(action);
    if (next.isFull) {
      onMessage(BUILD_FULL_TEXT);
      return;
    }
    if (next.lastAddedUids.length > 0) onAdded(next.lastAddedUids);
    if (next.skippedCount > 0) onMessage(toSkippedText(next.skippedCount));
  };

  return {
    copy: (uids: string[]) => setClip(toClipboardSteps(state.build, uids)),
    // null while nothing was copied.
    paste: clip === null ? null : (target: PasteTarget) => apply({ type: 'paste-steps', steps: clip, target, catalog }),
    duplicate: (uids: string[]) => apply({ type: 'duplicate-steps', uids, catalog }),
  };
};

const toSkippedText = (count: number) => `${count} skipped: already in the build.`;
