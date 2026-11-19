import { toSideName } from '../../build-order.helpers.ts';
import { countSideSteps, toDefaultHeroId, toKeptHeroId, toSideChangeText } from '../build-editor.helpers.ts';
import { saveLastSides } from '../build-editor.last-sides.ts';
import type { Dispatch } from 'react';
import type { Build, BuildCatalog, Side } from '../../build-order.types.ts';
import type { ConfirmRequest } from '../../confirm-dialog/hooks/use-confirm.ts';
import type { EditorAction } from '../build-editor.reducer.ts';

interface EditorActionsInput {
  build: Build;
  sides: Side[];
  // Entities of the current sides: the kept steps are checked against them (no unit without a building).
  catalog: BuildCatalog;
  dispatch: Dispatch<EditorAction>;
  ask: (request: ConfirmRequest) => Promise<boolean>;
  // Loads the catalogs of the new sides before the change is applied.
  ensureSides: (sideIds: (string | null)[]) => Promise<void>;
}

// Changes that may lose steps ask first; the new sides are loaded before the build changes. A side picked here is the
// one a new build opens with (Kieirra 2026-11-19); an opened link never is.
export const useEditorActions = ({ build, sides, catalog, dispatch, ask, ensureSides }: EditorActionsInput) => {
  const confirmSideChange = async (kind: 'faction' | 'mercenary', oldSideId: string | null) => {
    const count = countSideSteps(build, oldSideId);
    if (count === 0) return true;
    const label = kind === 'faction' ? 'Change faction' : 'Change mercenary';
    const message = toSideChangeText(kind, count, toSideName(sides, oldSideId) ?? oldSideId ?? '');
    return ask({ message, confirmLabel: label, cancelLabel: 'Cancel' });
  };

  const changeFaction = async (factionId: string) => {
    if (factionId === build.factionId || !(await confirmSideChange('faction', build.factionId))) return;
    await ensureSides([factionId, build.mercenaryId]);
    dispatch({ type: 'set-faction', factionId, heroId: toDefaultHeroId(sides, factionId, build.mercenaryId), catalog });
    saveLastSides({ factionId, mercenaryId: build.mercenaryId });
  };

  const changeMercenary = async (mercenaryId: string | null) => {
    if (mercenaryId === build.mercenaryId || !(await confirmSideChange('mercenary', build.mercenaryId))) return;
    await ensureSides([build.factionId, mercenaryId]);
    dispatch({ type: 'set-mercenary', mercenaryId, heroId: toKeptHeroId(sides, build.factionId, mercenaryId, build.heroId), catalog });
    saveLastSides({ factionId: build.factionId, mercenaryId });
  };

  return { changeFaction, changeMercenary };
};
