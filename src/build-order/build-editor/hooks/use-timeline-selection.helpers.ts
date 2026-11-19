export interface SelectionState {
  uids: ReadonlySet<string>;
  // Step whose panel is open: a click without modifier on it alone.
  panelUid: string | null;
}

export const EMPTY_SELECTION: SelectionState = { uids: new Set(), panelUid: null };

// A click without modifier: this step alone, its panel open.
export const toSingleSelection = (uid: string): SelectionState => ({ uids: new Set([uid]), panelUid: uid });

// Ctrl/Cmd or Shift + click (Kieirra 2026-11-19): the step joins or leaves the selection, no panel.
export const toToggledSelection = ({ uids }: SelectionState, uid: string): SelectionState => {
  const next = new Set(uids);
  if (!next.delete(uid)) next.add(uid);
  return { uids: next, panelUid: null };
};

// Steps under a selection rectangle, or a paste: they replace the selection, or join it (`isAdditive`), no panel.
export const toManySelection = ({ uids }: SelectionState, added: string[], isAdditive: boolean): SelectionState => ({
  uids: new Set(isAdditive ? [...uids, ...added] : added),
  panelUid: null,
});

// The steps gone from the build (undo, removal) leave the selection; the same state when none did.
export const toKeptSelection = (state: SelectionState, stepUids: ReadonlySet<string>): SelectionState => {
  if ([...state.uids].every((uid) => stepUids.has(uid))) return state;
  const uids = new Set([...state.uids].filter((uid) => stepUids.has(uid)));
  return { uids, panelUid: state.panelUid !== null && uids.has(state.panelUid) ? state.panelUid : null };
};
