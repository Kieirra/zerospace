import { describe, expect, it } from 'vitest';
import { entities, sideFiles } from '../../build-order/engine/engine.wiki-fixtures.ts';
import { parseBuildOrder, resolveBuildOrder } from '../guide-page/build-order/build-order.helpers.ts';
import { toTheorycraft } from './theorycraft-link.data.ts';

const SOURCES = { entities, factions: new Map(sideFiles.map((side) => [side.id, { ...side }])) };
const SCOPE = { label: 'the-legion', entities: entities.filter(({ faction, kind }) => faction === 'the-legion' && kind !== 'talent') };

describe('toTheorycraft', () => {
  it('should open a guide without mercenary with the first one, as New build (Kieirra 2026-11-19)', () => {
    const header = { factionId: 'the-legion', mercenaryId: null, heroId: 'the-legion/hero/galavax', title: 'T', author: 'K' };
    const { build } = toTheorycraft(resolveBuildOrder(parseBuildOrder('1. Idal Conduit'), SCOPE), header, SOURCES);

    expect(build).toMatchObject({ mercenaryId: 'arandi', heroId: 'the-legion/hero/galavax' });
    expect(build.timed.map(({ entityId }) => entityId)).toEqual(['the-legion/building/idal-conduit']);
  });
});
