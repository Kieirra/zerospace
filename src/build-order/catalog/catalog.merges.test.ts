import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { entities, getCatalog } from '../engine/engine.wiki-fixtures.ts';
import { toMergeCost, toMergeRecipeLine } from './catalog.merges.ts';

const xol = toCatalogMap(getCatalog('the-xol').entities);
const toId = (slug: string) => `the-xol/unit/${slug}`;

// Supplement of each merge (Hexite, Flux): its data cost minus the data cost per unit of its inputs (US-009).
const MERGE_COSTS: [string, number, number][] = [
  ['echo', 0, 50],
  ['defiant', 0, 50],
  ['synapse', 0, 50],
  ['gravitron', 50, 100],
  ['aegis', 50, 100],
  ['eradicator', 50, 100],
  ['paradox', 0, 0],
  ['cataclyst', 0, 0],
];

describe('Xol merges in the catalog', () => {
  it.each(MERGE_COSTS)('should cost the supplement of %s: %d Hexite, %d Flux', (slug, hexite, flux) => {
    const data = entities.find(({ id }) => id === toId(slug));
    if (!data) throw new Error(`no ${slug} in the wiki`);

    expect(toMergeCost(data, entities)).toEqual({ hexite, flux });
    expect(xol.get(toId(slug))).toMatchObject({ category: 'merge', cost: { hexite, flux } });
  });

  it('should write the recipe in units', () => {
    expect(toMergeRecipeLine(xol.get(toId('echo')) ?? {}, xol)).toBe('2 Roller');
    expect(toMergeRecipeLine(xol.get(toId('gravitron')) ?? {}, xol)).toBe('3 Roller');
    expect(toMergeRecipeLine(xol.get(toId('paradox')) ?? {}, xol)).toBe('Defiant + Synapse + Echo');
  });

  it('should make the tier 1 units with a charge, in no time', () => {
    for (const slug of ['roller', 'xyther', 'spectron']) expect(xol.get(toId(slug))).toMatchObject({ category: 'unit', duration: 0 });
    expect(xol.get('the-xol/building/gyroforge')?.productionCharges).toEqual({ initial: 1, max: 4, recharge: 35 });
  });

  it('should keep the Replicate energy and the owner limit of the data', () => {
    expect(xol.get(toId('synapse'))).toMatchObject({ replicateEnergy: 19 });
    expect(xol.get(toId('paradox'))).toMatchObject({ ownerLimit: 1, replicateEnergy: 45 });
    expect(xol.get('the-xol/unit/scouting-drone')?.replicateEnergy).toBeUndefined();
  });
});
