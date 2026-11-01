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

  it('should keep the cost first and place the game stats right after HP', () => {
    const hel: Entity = {
      id: 'marran/hero/hel',
      kind: 'hero',
      faction: 'marran',
      name: 'Hel',
      cost: { hexite: 220 },
      hp: 130,
      combatStats: [
        { label: 'Health regeneration', value: 2, unit: '/s' },
        { label: 'Stun resistance', value: 40, unit: '%' },
      ],
    };

    const labels = buildStatTiles(hel).map(({ label }) => label);

    expect(labels[0]).toBe('Cost');
    expect(labels.indexOf('Regen')).toBe(labels.indexOf('HP') + 1);
    expect(labels.indexOf('Stun resistance')).toBeGreaterThan(labels.indexOf('HP'));
  });

  it('should let the transport accepts tile span two tiles because its value can be long', () => {
    const strider: Entity = {
      id: 'protectorate/unit/strider',
      kind: 'unit',
      faction: 'protectorate',
      name: 'Strider',
      transport: { capacity: 16, targets: ['Light'], excludedTargets: ['Hero', 'Air'] },
    };

    const acceptsTile = buildStatTiles(strider).find(({ label }) => label === 'Transport accepts');

    expect(acceptsTile).toEqual({ label: 'Transport accepts', value: 'Light, Not Hero, Not Air', span: 2 });
  });
});
