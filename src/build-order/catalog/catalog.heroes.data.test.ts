import { describe, expect, it } from 'vitest';
import { getCatalog, sideFiles } from '../engine/engine.wiki-fixtures.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { getDefaultHeroId, getDefaultMercenaryId, getHeroPool } from './catalog.helpers.ts';

const FACTION_IDS = sideFiles.filter(({ kind }) => kind === 'faction').map(({ id }) => id);
const MERCENARY_IDS = sideFiles.filter(({ kind }) => kind === 'mercenary').map(({ id }) => id);

// No game without a mercenary (Kieirra 2026-11-19): every faction plays with one of them.
describe('Setup hero pool with a mercenary', () => {
  it('should require a mercenary for every faction, the first one by default', () => {
    expect(FACTION_IDS.every((factionId) => resolveRules(factionId).mercenaryRequired.value)).toBe(true);
    expect(getDefaultMercenaryId(sideFiles)).toBe(MERCENARY_IDS[0]);
  });

  it.each(FACTION_IDS.flatMap((factionId) => MERCENARY_IDS.map((mercenaryId) => [factionId, mercenaryId])))(
    'should keep the faction hero as the default one of %s + %s, the mercenary hero in the pool when the rules say so',
    (factionId, mercenaryId) => {
      const faction = getCatalog(factionId);
      const mercenary = getCatalog(mercenaryId);
      const rules = resolveRules(factionId);
      const pool = getHeroPool(faction.side, mercenary.side, rules);
      const heroIds = new Set(pool.map(({ heroId }) => heroId));

      expect(pool.find(({ heroId }) => heroId === getDefaultHeroId(pool))?.origin).toBe('faction');
      expect(mercenary.side.heroIds.every((heroId) => heroIds.has(heroId))).toBe(rules.heroes.mercenaryHeroInPool.value);
      expect(heroIds.size).toBe(pool.length);
    },
  );
});
