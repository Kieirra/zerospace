import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { RESEARCH_LOCATIONS } from '../game-data/game-data.constants.ts';
import { getResearchLocation } from './engine.research-location.ts';
import { getCatalog } from './engine.wiki-fixtures.ts';

const ARMORY = 'the-legion/building/armory';
const CITADEL = 'the-legion/building/citadel';

describe('Legion research location from the wiki data', () => {
  const catalog = toCatalogMap(getCatalog('the-legion').entities);
  const researches = [...catalog.values()].flatMap((research) => {
    const target = catalog.get(research.appliesTo[0] ?? '');
    if (research.category !== 'research' || !target) return [];
    return [[research.id, target.kind === 'hero' ? ARMORY : CITADEL]];
  });

  it.each(researches)('should research %s in %s (Kieirra 2026-11-19)', (researchId, building) => {
    expect(getResearchLocation(catalog.get(researchId)!, catalog, RESEARCH_LOCATIONS)).toBe(building);
  });
});
