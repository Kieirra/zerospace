import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../../../build-order.helpers.ts';
import { BARRACKS, ENTITIES, SENTINEL, SUPPLY_PLATFORM, TRANSFORMATION, WORKER } from '../../../engine/engine.fixtures.ts';
import { toMadeInOptions } from './made-in-select.helpers.ts';

const CATALOG = toCatalogMap(ENTITIES);
const BUILD = {
  timed: [
    { uid: 's2', entityId: BARRACKS.id, at: 40 },
    { uid: 's1', entityId: BARRACKS.id, at: 30 },
    { uid: 's3', entityId: SUPPLY_PLATFORM.id, at: 50 },
  ],
};
const LANES = [
  { id: 'lane:base', label: 'Base' },
  { id: 'lane:s1', label: 'Barracks #1' },
  { id: 'lane:s2', label: 'Barracks #2' },
  { id: 'lane:s3', label: 'Supply Platform' },
];

describe('Made in: options', () => {
  it('should list the lanes able to make a unit, in lane order, with their label', () => {
    expect(toMadeInOptions(SENTINEL, BUILD, CATALOG, LANES)).toEqual([
      { uid: 's1', label: 'Barracks #1' },
      { uid: 's2', label: 'Barracks #2' },
    ]);
    expect(toMadeInOptions(WORKER, BUILD, CATALOG, LANES)).toEqual([{ uid: 'base', label: 'Base' }]);
  });

  it('should list the buildings a transformation applies to', () => {
    expect(toMadeInOptions(TRANSFORMATION, BUILD, CATALOG, LANES)).toEqual([{ uid: 's3', label: 'Supply Platform' }]);
  });

  it('should name a building with no lane yet (it never starts)', () => {
    expect(toMadeInOptions(SENTINEL, BUILD, CATALOG, LANES.slice(0, 2))).toEqual([
      { uid: 's1', label: 'Barracks #1' },
      { uid: 's2', label: BARRACKS.displayName },
    ]);
  });
});
