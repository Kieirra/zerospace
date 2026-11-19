import { getDefaultMercenaryId } from '../catalog/catalog.helpers.ts';
import { DEFAULT_FACTION_ID } from './build-editor.constants.ts';
import type { Side } from '../build-order.types.ts';

// Last faction and mercenary picked in the header (Kieirra 2026-11-19): an address without build opens on them.
export const LAST_SIDES_KEY = 'theorycraft.lastSides.v1';

export interface LastSides {
  factionId: string;
  mercenaryId: string | null;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

// Tolerant: unreadable JSON, a faction or a mercenary unknown to the sides falls back on the defaults (The Legion, the
// first mercenary), each on its own.
export const toLastSides = (raw: string | null, sides: Pick<Side, 'id' | 'kind'>[]): LastSides => {
  const saved = parseObject(raw);
  const isSide = (id: unknown, kind: Side['kind']) => sides.some((side) => side.id === id && side.kind === kind);
  return {
    factionId: isSide(saved.factionId, 'faction') ? String(saved.factionId) : DEFAULT_FACTION_ID,
    mercenaryId: isSide(saved.mercenaryId, 'mercenary') ? String(saved.mercenaryId) : getDefaultMercenaryId(sides),
  };
};

export const readLastSides = (sides: Pick<Side, 'id' | 'kind'>[], storage: StorageLike | null = getStorage()) =>
  toLastSides(tryRun(() => storage?.getItem(LAST_SIDES_KEY) ?? null) ?? null, sides);

// Never throws: private mode or a full storage only lose the preference.
export const saveLastSides = (lastSides: LastSides, storage: StorageLike | null = getStorage()) => {
  tryRun(() => storage?.setItem(LAST_SIDES_KEY, JSON.stringify(lastSides)));
};

// No storage on the server (Astro) nor where the browser refuses it.
const getStorage = (): StorageLike | null => (typeof window === 'undefined' ? null : (tryRun(() => window.localStorage) ?? null));

const tryRun = <T>(run: () => T): T | undefined => {
  try {
    return run();
  } catch {
    return undefined;
  }
};

const parseObject = (raw: string | null): Record<string, unknown> => {
  const value: unknown = raw === null ? null : tryRun(() => JSON.parse(raw));
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
};
