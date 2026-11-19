import { describe, expect, it } from 'vitest';
import { getCatalog, sideFiles } from '../engine/engine.wiki-fixtures.ts';
import { LAST_SIDES_KEY, readLastSides, saveLastSides, toLastSides } from './build-editor.last-sides.ts';

const SIDES = sideFiles.map(({ id }) => getCatalog(id).side);
const DEFAULTS = { factionId: 'the-legion', mercenaryId: 'arandi' };

const memoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), values };
};

describe('Last faction and mercenary (Kieirra 2026-11-19)', () => {
  it.each(SIDES.filter(({ kind }) => kind === 'faction').flatMap((faction) => SIDES.filter(({ kind }) => kind === 'mercenary').map((mercenary) => [faction.id, mercenary.id])))(
    'should give back %s + %s once saved',
    (factionId, mercenaryId) => {
      const storage = memoryStorage();
      saveLastSides({ factionId, mercenaryId }, storage);

      expect(readLastSides(SIDES, storage)).toEqual({ factionId, mercenaryId });
    },
  );

  it('should fall back on The Legion and the first mercenary without a saved choice', () => {
    expect(readLastSides(SIDES, memoryStorage())).toEqual(DEFAULTS);
    expect(readLastSides(SIDES, null)).toEqual(DEFAULTS);
  });

  it.each([
    ['unreadable JSON', '{oops'],
    ['not an object', '"the-xol"'],
    ['null', 'null'],
    ['unknown sides', '{"factionId":"atlantis","mercenaryId":"pirates"}'],
    ['sides of the wrong kind', '{"factionId":"arandi","mercenaryId":"the-xol"}'],
  ])('should fall back on the defaults with %s', (_, raw) => {
    expect(toLastSides(raw, SIDES)).toEqual(DEFAULTS);
  });

  it('should keep the side still known when the other one is gone', () => {
    expect(toLastSides('{"factionId":"the-xol","mercenaryId":"pirates"}', SIDES)).toEqual({ factionId: 'the-xol', mercenaryId: 'arandi' });
    expect(toLastSides('{"factionId":"atlantis","mercenaryId":"valkaru"}', SIDES)).toEqual({ factionId: 'the-legion', mercenaryId: 'valkaru' });
  });

  it('should never throw when the storage refuses (private mode, quota)', () => {
    const refusing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };

    expect(() => saveLastSides(DEFAULTS, refusing)).not.toThrow();
    expect(readLastSides(SIDES, refusing)).toEqual(DEFAULTS);
  });

  it('should write one versioned key', () => {
    const storage = memoryStorage();
    saveLastSides({ factionId: 'grell', mercenaryId: 'marran' }, storage);

    expect([...storage.values.keys()]).toEqual([LAST_SIDES_KEY]);
  });
});
