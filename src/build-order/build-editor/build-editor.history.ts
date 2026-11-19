import { editorReducer, INITIAL_EDITOR_STATE } from './build-editor.reducer.ts';
import type { EditorAction, EditorState } from './build-editor.reducer.ts';

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface EditorHistory extends History<EditorState> {
  // Typing the author: the keystrokes until the field is left make one entry.
  isEditingAuthor: boolean;
}

export type HistoryAction = EditorAction | { type: 'undo' } | { type: 'redo' } | { type: 'end-edit' };

export const HISTORY_LIMIT = 100;

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });

const startHistory = (present: EditorState) => ({ ...createHistory(present), isEditingAuthor: false });

export const INITIAL_EDITOR_HISTORY: EditorHistory = startHistory(INITIAL_EDITOR_STATE);

// The oldest entries leave once the limit is reached; a new entry clears what could be redone.
export const pushHistory = <T>(history: History<T>, next: T, limit = HISTORY_LIMIT): History<T> => ({
  past: [...history.past, history.present].slice(-limit),
  present: next,
  future: [],
});

export const undo = <T>(history: History<T>): History<T> => {
  if (history.past.length === 0) return history;
  return { past: history.past.slice(0, -1), present: history.past[history.past.length - 1], future: [history.present, ...history.future] };
};

export const redo = <T>(history: History<T>): History<T> => {
  if (history.future.length === 0) return history;
  return { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) };
};

// Every change of the build is one entry: a drag (`shift-at`, `move-to-lane`) or a paste is one action. A refused
// paste changes the state, not the build: no entry. A load, an unreadable link, or the first build created starts a
// new history.
export const editorHistoryReducer = (history: EditorHistory, action: HistoryAction): EditorHistory => {
  switch (action.type) {
    case 'undo':
      return toRestored(history, undo(history));
    case 'redo':
      return toRestored(history, redo(history));
    case 'end-edit':
      return history.isEditingAuthor ? { ...history, isEditingAuthor: false } : history;
    case 'load':
    case 'new':
      return startHistory(editorReducer(history.present, action));
  }
  const next = editorReducer(history.present, action);
  if (next === history.present) return history;
  if (action.type === 'create' && history.past.length === 0) return startHistory(next);
  if (next.build === history.present.build || (action.type === 'set-author' && history.isEditingAuthor)) {
    return { ...history, present: next };
  }
  return { ...pushHistory(history, next), isEditingAuthor: action.type === 'set-author' };
};

// A restored state neither selects the steps added back then nor repeats their toast.
const toRestored = (history: EditorHistory, moved: History<EditorState>): EditorHistory =>
  moved === history
    ? history
    : { ...moved, present: { ...INITIAL_EDITOR_STATE, build: moved.present.build }, isEditingAuthor: false };
