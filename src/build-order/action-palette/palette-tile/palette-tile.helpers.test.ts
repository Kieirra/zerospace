import { describe, expect, it } from 'vitest';
import { toTileDetails } from './palette-tile.helpers.ts';
import type { BuildEntity } from '../../build-order.types.ts';

const tile = (entity: Partial<BuildEntity>, disabledReason: string | null = null) => ({
  entity: { kind: 'building', category: 'building', duration: 35, ...entity } as BuildEntity,
  disabledReason,
  status: 'available' as const,
});

describe('toTileDetails', () => {
  it('should give the build time, and why the tile is disabled', () => {
    expect(toTileDetails(tile({}, 'Requires Barracks or Bestiary.'))).toEqual({
      time: 'Build time 0:35',
      requires: 'Requires Barracks or Bestiary.',
    });
  });

  it('should say nothing is required when the tile can be added', () => {
    expect(toTileDetails(tile({ kind: 'unit', category: 'unit', duration: 24 })).requires).toBeNull();
  });

  it.each<[Partial<BuildEntity>, string]>([
    [{ kind: 'upgrade', category: 'research', duration: 80 }, 'Research time 1:20'],
    [{ kind: 'unit', category: 'mercenary-unit', duration: 0 }, 'Instant, spends a mercenary slot'],
    [{ duration: null }, 'Build time unknown'],
  ])('should describe the time of %o as %s', (entity, time) => {
    expect(toTileDetails(tile(entity)).time).toBe(time);
  });
});
