import { useEffect, useState } from 'react';
import { STEAM_BUILD_ID } from '../../../shared/site.constants.ts';
import { loadSide } from '../../hooks/use-side-catalogs.ts';
import { resolveBuildLink } from '../../link/link.resolve.ts';
import { toKnownSides, toLoadPlan, toNewBuildAction, toResolvedNotices } from '../build-editor.load.ts';
import { readLastSides } from '../build-editor.last-sides.ts';
import type { Dispatch } from 'react';
import type { BuildLink, Side } from '../../build-order.types.ts';
import type { EditorAction } from '../build-editor.reducer.ts';

type LoadPhase = 'reading' | 'ready' | 'invalid' | 'error';

// Opens the build of `#b=`, else an empty build; `reload` reads the hash again (another link pasted, Back, Forward).
// An unreadable link leaves no build: its message shows.
export const useEditorLoad = (sides: Side[], dispatch: Dispatch<EditorAction>) => {
  const [phase, setPhase] = useState<LoadPhase>('reading');
  const [notices, setNotices] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const open = async () => {
      const plan = toLoadPlan(window.location.hash, toKnownSides(sides));
      const resolved = plan.kind === 'link' ? await resolveLink(plan.link) : null;
      if (!isCurrent) return;
      dispatch(resolved === null ? { type: 'new' } : { type: 'load', build: resolved.build });
      if (plan.kind === 'empty') dispatch(toNewBuildAction(sides, readLastSides(sides)));
      setNotices(resolved ? toResolvedNotices(resolved, STEAM_BUILD_ID) : []);
      setPhase(plan.kind === 'invalid' ? 'invalid' : 'ready');
    };
    setPhase('reading');
    open().catch(() => isCurrent && setPhase('error'));
    return () => {
      isCurrent = false;
    };
  }, [sides, dispatch, attempt]);

  const reload = () => setAttempt((value) => value + 1);

  return { phase, notices, reload };
};

const resolveLink = async (link: BuildLink) => {
  const [faction, mercenary] = await Promise.all([
    loadSide(link.factionId),
    link.mercenaryId === null ? null : loadSide(link.mercenaryId),
  ]);
  return resolveBuildLink(link, faction, mercenary);
};
