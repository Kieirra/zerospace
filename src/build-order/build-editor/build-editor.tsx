import { ConfirmDialog } from '../confirm-dialog/confirm-dialog.tsx';
import { useConfirm } from '../confirm-dialog/hooks/use-confirm.ts';
import { LINK_TEXTS } from '../link/link.constants.ts';
import { SidePicker } from '../side-picker/side-picker.tsx';
import { toDefaultHeroId } from './build-editor.helpers.ts';
import { DataErrorMessage } from './data-error-message/data-error-message.tsx';
import { EditorMessage } from './editor-message/editor-message.tsx';
import { EditorSkeleton } from './editor-skeleton/editor-skeleton.tsx';
import { EditorWorkspace } from './editor-workspace/editor-workspace.tsx';
import { useEditorCatalogs } from './hooks/use-editor-catalogs.ts';
import { useEditorHistory } from './hooks/use-editor-history.ts';
import { useEditorLoad } from './hooks/use-editor-load.ts';
import { useHashSync } from './hooks/use-hash-sync.ts';
import type { Side } from '../build-order.types.ts';

interface BuildEditorProps {
  sides: Side[];
}

// Editor island: opens the link or the side choice, then edits the build; the URL keeps it.
export const BuildEditor = ({ sides }: BuildEditorProps) => {
  const { state, dispatch, canUndo, canRedo } = useEditorHistory();
  const confirm = useConfirm();
  const load = useEditorLoad(sides, dispatch);
  const { build } = state;
  const hashSync = useHashSync(load.phase === 'ready' ? build : null, load.reload);
  const { catalogs, ensure, retry } = useEditorCatalogs(build?.factionId ?? null, build?.mercenaryId ?? null);

  const renderContent = () => {
    if (load.phase === 'error' || catalogs.status === 'error') {
      return <DataErrorMessage onRetry={load.phase === 'error' ? load.reload : retry} />;
    }
    if (load.phase === 'reading') return <EditorSkeleton />;
    if (load.phase === 'invalid') {
      return (
        <EditorMessage text={LINK_TEXTS.invalid}>
          <a href="/build-order/" className="border border-line bg-surface px-4 py-2 text-sm hover:bg-surface-hover">
            {LINK_TEXTS.newBuild}
          </a>
        </EditorMessage>
      );
    }
    if (build === null) {
      return (
        <SidePicker
          sides={sides}
          onStart={(factionId, mercenaryId) => {
            hashSync.startNewEntry();
            dispatch({ type: 'create', factionId, mercenaryId, heroId: toDefaultHeroId(sides, factionId, mercenaryId) });
          }}
        />
      );
    }
    if (catalogs.status !== 'ready') return <EditorSkeleton />;
    return (
      <EditorWorkspace
        state={{ ...state, build }}
        sides={sides}
        faction={catalogs.faction}
        mercenary={catalogs.mercenary}
        notices={load.notices}
        dispatch={dispatch}
        history={{ canUndo, canRedo, onUndo: () => dispatch({ type: 'undo' }), onRedo: () => dispatch({ type: 'redo' }) }}
        ask={confirm.ask}
        ensureSides={ensure}
      />
    );
  };

  return (
    <>
      {renderContent()}
      <ConfirmDialog request={confirm.request} onAnswer={confirm.answer} />
    </>
  );
};
