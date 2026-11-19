import { useEffect, useEffectEvent, useReducer, useRef } from 'react';
import { isShortcutBlocked } from '../../hooks/hotkeys.helpers.ts';
import { editorHistoryReducer, INITIAL_EDITOR_HISTORY } from '../build-editor.history.ts';

// Editor state with undo / redo: Ctrl + Z undoes, Ctrl + Y and Ctrl + Shift + Z redo.
// A text field keeps its own undo; nothing happens under a dialog or while a step is dragged.
export const useEditorHistory = () => {
  const [history, dispatch] = useReducer(editorHistoryReducer, INITIAL_EDITOR_HISTORY);
  // A drag holds the pointer down until the drop: undo waits for it.
  const isPointerDown = useRef(false);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const type = toHistoryType(event);
    if (type === null || event.defaultPrevented || isShortcutBlocked(event)) return;
    event.preventDefault();
    if (!isPointerDown.current) dispatch({ type });
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleKeyDown(event);
    const onPointerDown = () => {
      isPointerDown.current = true;
    };
    const onPointerUp = () => {
      isPointerDown.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onPointerUp, { capture: true });
    };
  }, []);

  return {
    state: history.present,
    dispatch,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
};

const toHistoryType = (event: KeyboardEvent) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && !event.shiftKey) return 'redo';
  return null;
};
