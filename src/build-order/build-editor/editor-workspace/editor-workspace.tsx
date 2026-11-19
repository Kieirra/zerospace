import { useMemo } from 'react';
import { EditorHeader } from '../../editor-header/editor-header.tsx';
import { SHARE_TEXTS } from '../../editor-header/share-button/share-button.constants.ts';
import { createSimulationContext, simulateBuild } from '../../engine/engine.ts';
import { useHighlight } from '../../hooks/use-highlight.ts';
import { encodeBuild } from '../../link/link.codec.ts';
import { toAbsoluteUrl, toEditUrl } from '../../link/link.helpers.ts';
import { NoticeBanner } from '../../notice-banner/notice-banner.tsx';
import { toRemovedText } from '../build-editor.helpers.ts';
import { editorReducer } from '../build-editor.reducer.ts';
import { EditorPalette } from '../editor-palette/editor-palette.tsx';
import { EditorToasts } from '../editor-toasts/editor-toasts.tsx';
import { EditorTimeline } from '../editor-timeline/editor-timeline.tsx';
import { useBuildClipboard } from '../hooks/use-build-clipboard.ts';
import { useEditorActions } from '../hooks/use-editor-actions.ts';
import { useEditorShortcuts } from '../hooks/use-editor-shortcuts.ts';
import { useEditorToasts } from '../hooks/use-editor-toasts.ts';
import { useEditorTimelineEditing } from '../hooks/use-editor-timeline-editing.ts';
import { useTimelineSelection } from '../hooks/use-timeline-selection.ts';
import { PaletteFold } from '../palette-fold/palette-fold.tsx';
import { StepPanel } from '../step-panel/step-panel.tsx';
import type { Dispatch } from 'react';
import type { Build, Side, SideCatalog } from '../../build-order.types.ts';
import type { ConfirmRequest } from '../../confirm-dialog/hooks/use-confirm.ts';
import type { HistoryButtonsProps } from '../../editor-header/history-buttons/history-buttons.tsx';
import type { HistoryAction } from '../build-editor.history.ts';
import type { EditorState } from '../build-editor.reducer.ts';

interface EditorWorkspaceProps {
  state: EditorState & { build: Build };
  sides: Side[];
  faction: SideCatalog;
  mercenary: SideCatalog | null;
  notices: string[];
  dispatch: Dispatch<HistoryAction>;
  history: HistoryButtonsProps;
  ask: (request: ConfirmRequest) => Promise<boolean>;
  ensureSides: (sideIds: (string | null)[]) => Promise<void>;
}

const RESET_TEXT = 'Build reset.';

// The site keeps its pages 1152 px wide: the editor takes the window width (up to 1800 px) for its timeline.
const WIDE_LAYOUT_STYLE = { width: 'min(100vw - 48px, 1800px)', marginLeft: 'calc(50% - min(50vw - 24px, 900px))' };

// The editor once the build and its catalogs are there: every change is simulated again in the same frame.
// One-line header, then the palette (foldable) beside the live timeline; nothing follows the page scroll.
export const EditorWorkspace = ({ state, sides, faction, mercenary, notices, dispatch, history, ask, ensureSides }: EditorWorkspaceProps) => {
  const { build } = state;
  // Title and author change nothing simulated: typing them neither simulates again nor redraws the timeline.
  const simulated = useMemo(
    () => build,
    [build.timed, build.queued, build.factionId, build.mercenaryId, build.heroId, build.dataVersion],
  );
  const { context, result } = useMemo(() => {
    const simulationContext = createSimulationContext(simulated, faction, mercenary);
    return { context: simulationContext, result: simulateBuild(simulated, simulationContext) };
  }, [simulated, faction, mercenary]);
  const { catalog } = context;
  const { highlightedStepUid, highlight } = useHighlight();
  const toasts = useEditorToasts(build);
  const { showMessage } = toasts;
  const selection = useTimelineSelection(simulated);
  const selectedUids = [...selection.selectedUids];
  const clipboard = useBuildClipboard({ state, catalog, dispatch, onAdded: selection.selectMany, onMessage: showMessage });
  const actions = useEditorActions({ build, sides, catalog, dispatch, ask, ensureSides });
  const removeSteps = (uids: string[]) => {
    const action = { type: 'remove-steps' as const, uids, catalog };
    dispatch(action);
    toasts.undoToast.show(toRemovedText(build, editorReducer(state, action).build, catalog));
  };
  const removeSelected = () => {
    removeSteps(selectedUids);
    selection.clear();
  };
  const { editing, toPasteTarget } = useEditorTimelineEditing({
    build: simulated,
    context,
    result,
    selection,
    dispatch,
    onRemove: removeSteps,
    onDuplicate: clipboard.duplicate,
  });
  const hasSelection = selectedUids.length > 0;
  const { paste } = clipboard;
  useEditorShortcuts({
    remove: hasSelection ? removeSelected : null,
    copy: hasSelection ? () => clipboard.copy(selectedUids) : null,
    paste: paste && (() => paste(toPasteTarget())),
    duplicate: hasSelection ? () => clipboard.duplicate(selectedUids) : null,
    clear: hasSelection ? selection.clear : null,
  });

  return (
    <div className="flex flex-col gap-4" style={WIDE_LAYOUT_STYLE}>
      <EditorHeader
        build={build}
        sides={sides}
        catalog={catalog}
        history={history}
        share={{
          getUrl: () => toAbsoluteUrl(toEditUrl(encodeBuild(build)), window.location.origin),
          onCopied: () => showMessage(SHARE_TEXTS.copied),
          onFailed: () => showMessage(SHARE_TEXTS.failed),
        }}
        onFaction={actions.changeFaction}
        onMercenary={actions.changeMercenary}
        onHero={(heroId) => dispatch({ type: 'set-hero', heroId })}
        onTitle={(title) => dispatch({ type: 'set-title', title })}
        onAuthor={(author) => dispatch({ type: 'set-author', author })}
        onAuthorDone={() => dispatch({ type: 'end-edit' })}
        onReset={() => {
          dispatch({ type: 'reset' });
          toasts.undoToast.show(RESET_TEXT);
        }}
      />
      {notices.map((text) => (
        <NoticeBanner key={text} text={text} />
      ))}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5">
        <PaletteFold>
          {(foldButton) => (
            <EditorPalette
              build={simulated}
              selectedStepUid={selectedUids.length === 1 ? selectedUids[0] : null}
              context={context}
              headerAction={foldButton}
              dispatch={dispatch}
            />
          )}
        </PaletteFold>
        <EditorTimeline
          result={result}
          build={simulated}
          catalog={catalog}
          highlightedStepUid={highlightedStepUid}
          onHighlight={highlight}
          editing={editing}
        />
      </div>
      {selection.panelUid !== null && (
        <StepPanel
          stepUid={selection.panelUid}
          build={simulated}
          result={result}
          context={context}
          dispatch={dispatch}
          onRemove={removeSelected}
          onClose={selection.closePanel}
          onEscape={selection.clear}
        />
      )}
      <EditorToasts toasts={toasts} onUndo={() => dispatch({ type: 'undo' })} />
    </div>
  );
};
