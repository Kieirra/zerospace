import { describe, expect, it } from 'vitest';
import {
  BARRACKS,
  DRONE,
  ENTITIES,
  LAB,
  RESEARCH,
  SUPPLY_PLATFORM,
  TRANSFORMATION,
  TURRET_PLATFORM,
  building,
  codesOf,
  context,
  entity,
  hasOrder,
  messagesOf,
  orderOf,
  research,
  simulate,
  stepOf,
  transformation,
  unit,
  values,
} from './engine.fixtures.ts';
import type { BuildEntity } from '../build-order.types.ts';

const withEntities = (extra: BuildEntity[], overrides: Parameters<typeof values>[0] = {}) =>
  context({ entities: [...ENTITIES, ...extra], values: values(overrides) });

const toResearch = (id: string, fields: Partial<BuildEntity> = {}) =>
  entity(`upgrade/${id}`, { kind: 'upgrade', category: 'research', requires: [LAB.id], ...fields });

describe('Simulation: researches', () => {
  it('should research in the building it requires once it is built', () => {
    const upgrade = research(RESEARCH.id, 0);
    const result = simulate([building(LAB.id, 0, 'lab'), upgrade]);

    expect(orderOf(result, upgrade)).toMatchObject({ laneId: 'lane:lab', clickAt: 0, startAt: 20, endAt: 35, waits: { requirement: 20 } });
    expect(codesOf(result, upgrade)).toEqual([]);
  });

  it('should research in parallel with the production of the same building', () => {
    const drone = unit(DRONE.id);
    const upgrade = research(RESEARCH.id, 0);
    const result = simulate([building(LAB.id, 0, 'lab'), upgrade], [drone]);

    expect(orderOf(result, drone)).toMatchObject({ laneId: 'lane:lab', startAt: 20, endAt: 30 });
    expect(orderOf(result, upgrade)).toMatchObject({ laneId: 'lane:lab', startAt: 20, endAt: 35 });
  });

  it('should run one research at a time in a building', () => {
    const other = toResearch('other-research');
    const first = research(RESEARCH.id, 0);
    const second = research(other.id, 0);
    const result = simulate([building(LAB.id, 0), first, second], [], withEntities([other]));

    expect(orderOf(result, second)).toMatchObject({ startAt: 35, waits: { requirement: 20, 'producer-busy': 15 } });
  });

  // PO8: no single required building, so the research runs outside any thread, on the base lane.
  it('should place a research of unknown location on the base lane with a warning only', () => {
    const orphan = toResearch('orphan', { requires: [LAB.id, BARRACKS.id] });
    const upgrade = research(orphan.id, 0);
    const result = simulate([building(LAB.id, 0), building(BARRACKS.id, 0), upgrade], [], withEntities([orphan]));

    expect(stepOf(result, upgrade).diagnostics).toEqual([
      expect.objectContaining({ code: 'unknown-research-location', severity: 'warning', message: 'Research location unknown: timing not checked.' }),
    ]);
    expect(orderOf(result, upgrade)).toMatchObject({ laneId: 'lane:base', startAt: 40 });
    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  });

  it('should use the declared research location first', () => {
    const upgrade = research(RESEARCH.id, 0);
    const result = simulate(
      [building(LAB.id, 0), building(BARRACKS.id, 0, 'barracks'), upgrade],
      [],
      withEntities([], { researchLocations: { [RESEARCH.id]: BARRACKS.id } }),
    );

    expect(orderOf(result, upgrade).laneId).toBe('lane:barracks');
  });

  // Over time: the one clicked first wins, whatever its place in `timed`.
  it('should refuse the later copy of a research, with the click time of the first one', () => {
    const late = research(RESEARCH.id, 30);
    const early = research(RESEARCH.id, 20);
    const result = simulate([building(LAB.id, 0), late, early]);

    expect(stepOf(result, late)).toMatchObject({ clickAt: null, startAt: null, endAt: null });
    expect(hasOrder(result, late)).toBe(false);
    expect(messagesOf(result, late)).toEqual(['Already researched at 0:20.']);
    expect(hasOrder(result, early)).toBe(true);
    expect(result.orders).toHaveLength(2);
  });

  it('should refuse a second research of the same exclusive group', () => {
    const fire = toResearch('fire-rounds', { exclusiveGroup: 'ammo' });
    const ice = toResearch('ice-rounds', { exclusiveGroup: 'ammo' });
    const second = research(ice.id, 40);
    const result = simulate([building(LAB.id, 0), research(fire.id, 20), second], [], withEntities([fire, ice]));

    expect(hasOrder(result, second)).toBe(false);
    expect(messagesOf(result, second)).toEqual(['Only one of this group: Fire Rounds is already at 0:20.']);
  });

  it('should refuse an entity missing from the game data', () => {
    const removed = building('test/building/removed', 0);
    const result = simulate([removed]);

    expect(hasOrder(result, removed)).toBe(false);
    expect(messagesOf(result, removed)).toEqual(['Not in the current game data.']);
  });
});

describe('Simulation: transformations', () => {
  it('should give the new id to the instance at the end of the transformation', () => {
    const change = transformation(TRANSFORMATION.id, 0);
    const result = simulate([building(SUPPLY_PLATFORM.id, 0, 'platform'), change]);

    expect(orderOf(result, change)).toMatchObject({ laneId: 'lane:platform', clickAt: 0, startAt: 30, endAt: 40 });
    expect(result.lanes.find(({ id }) => id === 'lane:platform')).toMatchObject({
      entityId: TURRET_PLATFORM.id,
      originalEntityId: SUPPLY_PLATFORM.id,
      label: 'Turret Platform',
    });
  });

  it('should unlock what requires the new building once transformed', () => {
    const guard = entity('building/guard-post', { kind: 'building', category: 'building', requires: [TURRET_PLATFORM.id] });
    const post = building(guard.id, 0);
    const result = simulate([building(SUPPLY_PLATFORM.id, 0), transformation(TRANSFORMATION.id, 0), post], [], withEntities([guard]));

    expect(messagesOf(result, post)).toEqual([]);
    expect(orderOf(result, post)).toMatchObject({ startAt: 40, waits: { requirement: 40 } });
  });

  it('should send a second Auto transformation to another instance', () => {
    const first = transformation(TRANSFORMATION.id, 0);
    const second = transformation(TRANSFORMATION.id, 0);
    const result = simulate([building(SUPPLY_PLATFORM.id, 0, 'p1'), building(SUPPLY_PLATFORM.id, 0, 'p2'), first, second]);

    expect([orderOf(result, first).laneId, orderOf(result, second).laneId]).toEqual(['lane:p1', 'lane:p2']);
  });

  it('should run a pinned transformation on its instance', () => {
    const pinned = transformation(TRANSFORMATION.id, 0, 'p2');
    const result = simulate([building(SUPPLY_PLATFORM.id, 0, 'p1'), building(SUPPLY_PLATFORM.id, 0, 'p2'), pinned]);

    expect(orderOf(result, pinned).laneId).toBe('lane:p2');
  });

  it('should never start a transformation when every instance is already transformed', () => {
    const second = transformation(TRANSFORMATION.id, 0);
    const result = simulate([building(SUPPLY_PLATFORM.id, 0), transformation(TRANSFORMATION.id, 0), second]);

    expect(orderOf(result, second).startAt).toBeNull();
    expect(messagesOf(result, second)).toEqual(['Never starts: its building is never free.']);
  });

  it('should report a missing producer and show the transformation on the base lane', () => {
    const lonely = transformation(TRANSFORMATION.id, 0);
    const result = simulate([lonely]);

    expect(codesOf(result, lonely)).toEqual(['missing-producer']);
    expect(messagesOf(result, lonely)).toEqual(['No Supply Platform to produce this.']);
    expect(orderOf(result, lonely).laneId).toBe('lane:base');
  });
});
