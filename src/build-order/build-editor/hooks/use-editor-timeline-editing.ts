import { useEffect, useMemo, useRef } from 'react';
import { simulateBuild } from '../../engine/engine.ts';
import { INITIAL_EDITOR_STATE, editorReducer } from '../build-editor.reducer.ts';
import {
  REFUSED_DROP,
  toAddedMark,
  toDragOrigin,
  toDropAction,
  toDropLabel,
  toLaneUid,
  toSamePlace,
  toSamePlaceAt,
  toStepAt,
} from './use-editor-timeline-editing.helpers.ts';
import type { Dispatch } from 'react';
import type { Build } from '../../build-order.types.ts';
import type { SimulationContext, SimulationResult } from '../../engine/engine.types.ts';
import type { DropPreview, TimelineEditing } from '../../timeline/timeline-editing.ts';
import type { PasteTarget } from '../build-editor.clipboard.ts';
import type { EditorAction } from '../build-editor.reducer.ts';
import type { useTimelineSelection } from './use-timeline-selection.ts';

interface TimelineEditingOptions {
  build: Build;
  context: SimulationContext;
  // Simulation of `build`: where each dragged step starts from (the left edge of its mark).
  result: SimulationResult;
  selection: ReturnType<typeof useTimelineSelection>;
  dispatch: Dispatch<EditorAction>;
  onRemove: (stepUids: string[]) => void;
  onDuplicate: (stepUids: string[]) => void;
}

const NO_PASTE_TARGET: PasteTarget = { at: null, laneUid: null };

// What the editor's timeline edits: the selection, the drops of a dragged mark, click handle or palette card, the
// removal and the duplication of its marks, and where the pointer is over the lanes (a paste lands there). A preview is
// simulated once per action a drop would give (whole seconds), never on every move. Memoized: the timeline only redraws when the build
// or the selection change.
export const useEditorTimelineEditing = ({ build, context, result, selection, dispatch, onRemove, onDuplicate }: TimelineEditingOptions) => {
  const { selectedUids, select, toggle, selectMany, clear } = selection;
  const pasteTarget = useRef<PasteTarget>(NO_PASTE_TARGET);
  // Read at the click: the memoized editing calls the removal and the duplication of the last render.
  const commands = useRef({ onRemove, onDuplicate });
  useEffect(() => {
    commands.current = { onRemove, onDuplicate };
  });
  const editing = useMemo<TimelineEditing>(() => {
    const previews = new Map<string, DropPreview>();
    return {
      selectedUids,
      onSelect: select,
      onToggle: toggle,
      onSelectRect: selectMany,
      onClearSelection: clear,
      onLanesHover: (pointer) => {
        pasteTarget.current = pointer ? { at: Math.round(pointer.t), laneUid: toLaneUid(pointer.laneId) } : NO_PASTE_TARGET;
      },
      canDrag: (stepUid) => toDragOrigin(build, result, stepUid) !== null,
      previewDrop: (source, target) => {
        const action = toDropAction(build, result, context.catalog, source, target, selectedUids);
        if (action === REFUSED_DROP) return null;
        if (!action) return source.kind === 'entity' ? null : toSamePlace(toSamePlaceAt(build, result, source));
        const key = JSON.stringify(action);
        const cached = previews.get(key);
        if (cached) return cached;
        // The very build the drop gives: its click time is the one the line shows.
        const next = editorReducer({ ...INITIAL_EDITOR_STATE, build }, action);
        const stepUid = source.kind === 'entity' ? next.lastAddedUids[0] : source.uid;
        if (!next.build || !stepUid) return toSamePlace(null);
        const simulated = simulateBuild(next.build, context);
        const preview = {
          label: toDropLabel(action, stepUid, next.build, simulated),
          isSamePlace: false,
          at: toStepAt(next.build, stepUid) ?? null,
          laneId: action.type === 'move-to-lane' || action.type === 'add-queued' ? target.laneId : null,
          added: action.type === 'add-queued' ? toAddedMark(next.build, simulated, context.catalog, stepUid) : undefined,
        };
        previews.set(key, preview);
        return preview;
      },
      onDrop: (source, target) => {
        const action = toDropAction(build, result, context.catalog, source, target, selectedUids);
        if (action && action !== REFUSED_DROP) dispatch(action);
      },
      onRemove: (stepUids) => commands.current.onRemove(stepUids),
      onDuplicate: (stepUids) => commands.current.onDuplicate(stepUids),
    };
  }, [selectedUids, select, toggle, selectMany, clear, build, context, result, dispatch]);
  return { editing, toPasteTarget: () => pasteTarget.current };
};
