import { describe, expect, it } from 'vitest';
import type { Entity } from '../../wiki.types.ts';
import { buildStatTiles } from './entity-stats.helpers.ts';

describe('Entity stat tiles', () => {
  it('should show the unit cost with the batch size and the exact batch cost when units come in batches', () => {
    const stinger: Entity = { id: 'grell/unit/stinger', kind: 'unit', faction: 'grell', name: 'Stinger', cost: { hexite: 75 }, count: 3 };

    const [costTile] = buildStatTiles(stinger);

    expect(costTile).toEqual({
      label: 'Cost',
      value: [{ amount: '25', resource: 'hexite' }],
      batch: { count: 3, cost: [{ amount: '75', resource: 'hexite' }] },
    });
  });
});
