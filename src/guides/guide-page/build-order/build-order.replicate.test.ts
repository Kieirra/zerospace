import { describe, expect, it } from 'vitest';
import { entities } from '../../../build-order/engine/engine.wiki-fixtures.ts';
import { parseBuildOrder, resolveBuildOrder } from './build-order.helpers.ts';

// `Replicate (on X)` (US-009): the unit a copy targets.
const SCOPE = {
  label: 'the-xol + arandi',
  entities: entities.filter(({ faction, kind }) => ['the-xol', 'arandi'].includes(faction) && kind !== 'talent'),
};

const resolveFirst = (text: string) => resolveBuildOrder(parseBuildOrder(text), SCOPE).steps[0].groups[0].items[0];

describe('Build order: Replicate (on X)', () => {
  it('should resolve the target of Replicate, before a loop or a trigger', () => {
    expect(resolveFirst('1. 2 Replicate (on Synapse)')).toMatchObject({
      count: 2,
      entity: { id: 'the-xol/topbar/replicate' },
      on: { id: 'the-xol/unit/synapse' },
    });
    expect(resolveFirst('1. Replicate (on Roller) (-> Gyroforge)').trigger).toHaveLength(1);
  });

  it('should keep a Replicate without target', () => {
    expect(resolveFirst('1. Replicate').on).toBeUndefined();
  });

  it('should refuse (on X) on another item than Replicate', () => {
    expect(() => resolveFirst('1. Roller (on Synapse)')).toThrow('bo line 1: "Roller" cannot target a unit (only Replicate).');
  });

  it('should refuse a target that is not a unit', () => {
    expect(() => resolveFirst('1. Replicate (on World Forge)')).toThrow('bo line 1: "World Forge" cannot be replicated (not a unit).');
  });
});
