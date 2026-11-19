import { useEffect, useState } from 'react';
import { loadSide } from '../../hooks/use-side-catalogs.ts';
import type { CatalogsState, SideCatalog } from '../../build-order.types.ts';

// Keeps every side loaded during the page. `ensure` loads sides before a side change, so the editor never
// renders a build with the catalogs of other sides (no skeleton flash, palette state kept).
export const useEditorCatalogs = (factionId: string | null, mercenaryId: string | null) => {
  const [loaded, setLoaded] = useState<ReadonlyMap<string, SideCatalog>>(new Map());
  const [hasFailed, setHasFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const ensure = (sideIds: (string | null)[]) =>
    Promise.all(sideIds.filter((id) => id !== null).map(loadSide)).then(
      (catalogs) => setLoaded((current) => new Map([...current, ...catalogs.map((catalog) => [catalog.side.id, catalog] as const)])),
      () => setHasFailed(true),
    );

  useEffect(() => {
    if (factionId !== null) ensure([factionId, mercenaryId]);
    // `ensure` only adds catalogs: a late answer for older sides is harmless.
  }, [factionId, mercenaryId, attempt]);

  const retry = () => {
    setHasFailed(false);
    setAttempt((value) => value + 1);
  };

  return { catalogs: toCatalogsState(loaded, factionId, mercenaryId, hasFailed), ensure, retry };
};

const toCatalogsState = (
  loaded: ReadonlyMap<string, SideCatalog>,
  factionId: string | null,
  mercenaryId: string | null,
  hasFailed: boolean,
): CatalogsState => {
  if (hasFailed) return { status: 'error' };
  const faction = factionId === null ? undefined : loaded.get(factionId);
  const mercenary = mercenaryId === null ? null : loaded.get(mercenaryId);
  return faction && mercenary !== undefined ? { status: 'ready', faction, mercenary } : { status: 'loading' };
};
