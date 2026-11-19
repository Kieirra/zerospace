import { useMemo, useState } from 'react';
import { toAllSteps } from '../build-editor.helpers.ts';
import { EMPTY_SELECTION, toKeptSelection, toManySelection, toSingleSelection, toToggledSelection } from './use-timeline-selection.helpers.ts';
import type { Build } from '../../build-order.types.ts';
import type { SelectionState } from './use-timeline-selection.helpers.ts';

// Steps selected on the timeline (Kieirra 2026-11-19), out of the history: a click selects one step and opens its
// panel, a modifier click toggles one, a rectangle or a paste selects many; Escape or a click in the void clears.
export const useTimelineSelection = (build: Build) => {
  const [state, setState] = useState<SelectionState>(EMPTY_SELECTION);
  const kept = toKeptSelection(state, new Set(toAllSteps(build).map(({ uid }) => uid)));
  // Forgotten as soon as its step leaves (undo, removal): a new step given the same uid is not selected.
  if (kept !== state) setState(kept);
  // Stable: the memoized timeline only redraws when the selection itself changes.
  const actions = useMemo(
    () => ({
      select: (uid: string) => setState(toSingleSelection(uid)),
      toggle: (uid: string) => setState((current) => toToggledSelection(current, uid)),
      selectMany: (uids: string[], isAdditive = false) => setState((current) => toManySelection(current, uids, isAdditive)),
      clear: () => setState((current) => (current.uids.size === 0 && current.panelUid === null ? current : EMPTY_SELECTION)),
      // The panel closes, the selection stays (a palette card may still go on the selected building).
      closePanel: () => setState((current) => (current.panelUid === null ? current : { ...current, panelUid: null })),
    }),
    [],
  );
  return { selectedUids: kept.uids, panelUid: kept.panelUid, ...actions };
};
