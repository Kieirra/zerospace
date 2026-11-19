import { describe, expect, it } from 'vitest';
import {
  BARRACKS,
  BASE,
  ENTITIES,
  FREE_BUILDING,
  LAB,
  SENTINEL,
  SUPPLY_PLATFORM,
  TRANSFORMATION,
  TURRET_PLATFORM,
  WORKER,
  building,
  codesOf,
  context,
  entity,
  known,
  orderOf,
  recruit,
  research,
  rules,
  simulate,
  transformation,
  unit,
  values,
  withBank,
} from './engine.fixtures.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import type { BuildEntity } from '../build-order.types.ts';
import type { GameRules } from '../rules/rules.data.ts';

const withEntities = (extra: BuildEntity[], options: { rules?: GameRules; values?: Parameters<typeof values>[0] } = {}) =>
  context({ entities: [...ENTITIES, ...extra], rules: options.rules, values: values(options.values) });

const MERCENARY_HALL = entity('building/mercenary-hall', {
  kind: 'building',
  category: 'mercenary-building',
  duration: 10,
  productionCharges: { initial: 1, max: 2, recharge: 20 },
});
const CORSAIR = entity('unit/corsair', { category: 'mercenary-unit', producedBy: [MERCENARY_HALL.id] });

describe('Simulation: click times', () => {
  it('should start a building at its click time once the Hexite is there', () => {
    const barracks = building(BARRACKS.id, 0);

    expect(orderOf(simulate([barracks]), barracks)).toMatchObject({ clickAt: 0, startAt: 10, waits: { hexite: 10 } });
  });

  it('should start two buildings clicked in the same tick when the bank allows both', () => {
    const first = building(BARRACKS.id, 5);
    const second = building(BARRACKS.id, 5);
    const result = simulate([first, second], [], withBank(120));

    expect([orderOf(result, first).startAt, orderOf(result, second).startAt]).toEqual([5, 5]);
  });

  it('should wait for a requirement finished after the click time, without an error', () => {
    const tower = entity('building/tower', { kind: 'building', category: 'building', requires: [LAB.id] });
    const lab = building(LAB.id, 0);
    const late = building(tower.id, 5);
    const result = simulate([lab, late], [], withEntities([tower]));

    expect(orderOf(result, late)).toMatchObject({ clickAt: 5, startAt: 20, waits: { requirement: 15 } });
    expect(codesOf(result, late)).toEqual([]);
  });

  it('should report a requirement absent from the build', () => {
    const tower = entity('building/tower', { kind: 'building', category: 'building', requires: [LAB.id] });
    const lonely = building(tower.id, 5);

    expect(codesOf(simulate([lonely], [], withEntities([tower])), lonely)).toEqual(['missing-requirement']);
  });

  it('should not skip a click time while an order saves for a far resource', () => {
    const expensive = entity('building/expensive', { kind: 'building', category: 'building', cost: { hexite: 6000, flux: 0 } });
    const free = building(FREE_BUILDING.id, 50);
    const hall = building(MERCENARY_HALL.id, 0);
    const late = recruit(CORSAIR.id, 50);
    const result = simulate([building(expensive.id, 0), free, hall], [late], withEntities([expensive, MERCENARY_HALL, CORSAIR], { rules: rules('none') }));

    expect(orderOf(result, free).startAt).toBe(50);
    expect(orderOf(result, late).startAt).toBe(50);
  });
});

describe('Simulation: start priority', () => {
  const toCosted = (id: string, fields: Partial<BuildEntity>) => entity(id, { cost: { hexite: 180, flux: 0 }, ...fields });
  const SECOND_BASE = toCosted('building/second-base', {
    kind: 'building',
    category: 'building',
    economy: { kind: 'hexite-base', workers: 0, hexitePerWorkerPerMin: 0, workerSpawnSeconds: 10, pitHexite: 0, depletedRatePercent: 0 },
  });
  const DEPOT = toCosted('building/depot', { kind: 'building', category: 'building', supplyProvided: 10 });
  const CITADEL = toCosted('building/citadel', { kind: 'building', category: 'building' });
  // Released at 0:30, when its Lab is done: it does not save before the others are clicked.
  const TROOPER = toCosted('unit/trooper', { producedBy: [BASE.id], requires: [LAB.id] });
  const PRICEY_CORSAIR = toCosted('unit/pricey-corsair', { category: 'mercenary-unit', producedBy: [MERCENARY_HALL.id] });
  const extra = [SECOND_BASE, DEPOT, CITADEL, TROOPER, MERCENARY_HALL, PRICEY_CORSAIR];

  // Everything ready at 0:30 with 180 Hexite in the bank and 6 Hexite / s: one start every 30 s, in priority order.
  const simulateAll = (startPriority?: GameRules['startPriority']['value']) => {
    const steps = { base: building(SECOND_BASE.id, 30), depot: building(DEPOT.id, 30), citadel: building(CITADEL.id, 30) };
    const trooper = unit(TROOPER.id);
    const corsair = recruit(PRICEY_CORSAIR.id, 30);
    const result = simulate(
      [steps.citadel, steps.depot, steps.base, building(MERCENARY_HALL.id, 0), building(LAB.id, 10)],
      [trooper, corsair],
      withEntities(extra, { rules: rules('strict', startPriority) }),
    );
    return { result, ...steps, trooper, corsair };
  };

  it('should start the base, then a recruit, a supply building, a unit and another building', () => {
    const { result, base, depot, citadel, trooper, corsair } = simulateAll();

    expect([base, corsair, depot, trooper, citadel].map((step) => orderOf(result, step).startAt)).toEqual([30, 60, 90, 120, 150]);
    expect(orderOf(result, citadel).waits.hexite).toBe(120);
  });

  it('should follow `startPriority` alone', () => {
    const { result, base, depot, citadel, trooper } = simulateAll(['other', 'unit', 'supply', 'base', 'mercenary-unit']);

    expect([citadel, trooper, depot, base].map((step) => orderOf(result, step).startAt)).toEqual([30, 60, 90, 120]);
  });

  it('should start the base before a recruit ready in the same tick, the bank paying for one', () => {
    const base = building(SECOND_BASE.id, 30);
    const corsair = recruit(PRICEY_CORSAIR.id, 30);
    const result = simulate([base, building(MERCENARY_HALL.id, 0)], [corsair], withEntities([SECOND_BASE, MERCENARY_HALL, PRICEY_CORSAIR]));

    expect([base, corsair].map((step) => orderOf(result, step).startAt)).toEqual([30, 60]);
  });

  describe('harvester and base ready in the same tick, the bank paying for one', () => {
    const COSTED_HARVESTER = toCosted('unit/costed-harvester', { category: 'harvester', producedBy: [BASE.id] });
    const simulatePair = (startPriority?: GameRules['startPriority']['value']) => {
      const base = building(SECOND_BASE.id, 30);
      const harvester = recruit(COSTED_HARVESTER.id, 30);
      const result = simulate([base], [harvester], withEntities([SECOND_BASE, COSTED_HARVESTER], { rules: rules('strict', startPriority) }));
      return [harvester, base].map((step) => orderOf(result, step).startAt);
    };

    it('should start the base first with the base order', () => {
      expect(simulatePair()).toEqual([60, 30]);
    });

    it('should start the harvester first with The Legion order', () => {
      expect(simulatePair(resolveRules('the-legion').startPriority.value)).toEqual([30, 60]);
    });
  });
});

describe('Simulation: threads', () => {
  it('should research in parallel with the production of its building', () => {
    const baseResearch = entity('upgrade/base-research', { kind: 'upgrade', category: 'research', duration: 15, requires: [BASE.id] });
    const workers = [unit(WORKER.id), unit(WORKER.id), unit(WORKER.id), unit(WORKER.id)];
    const upgrade = research(baseResearch.id, 30);
    const result = simulate([upgrade], workers, withEntities([baseResearch], { values: { startingHexite: known(10_000) } }));

    expect(orderOf(result, upgrade)).toMatchObject({ laneId: 'lane:base', startAt: 30 });
    expect(workers.map((worker) => orderOf(result, worker).startAt)).toEqual([0, 18, 36, 54]);
  });

  it('should make the units of the new form once the transformation is done', () => {
    const turret = entity('unit/turret', { producedBy: [TURRET_PLATFORM.id] });
    const platform = building(SUPPLY_PLATFORM.id, 0, 'platform');
    const turretUnit = unit(turret.id);
    const result = simulate([platform, transformation(TRANSFORMATION.id, 0)], [turretUnit], withEntities([turret]));

    expect(orderOf(result, turretUnit)).toMatchObject({ laneId: 'lane:platform', clickAt: 40, startAt: 40 });
    expect(result.lanes.find(({ id }) => id === 'lane:platform')?.entityId).toBe(TURRET_PLATFORM.id);
  });

  it('should give one Auto unit to each free building, in parallel', () => {
    const barracks = [building(BARRACKS.id, 0, 'b1'), building(BARRACKS.id, 0, 'b2'), building(BARRACKS.id, 0, 'b3')];
    const sentinels = [unit(SENTINEL.id), unit(SENTINEL.id), unit(SENTINEL.id)];
    const result = simulate(barracks, sentinels, withBank(10_000, 10_000));

    expect(sentinels.map((sentinel) => orderOf(result, sentinel))).toEqual([
      expect.objectContaining({ laneId: 'lane:b1', startAt: 30 }),
      expect.objectContaining({ laneId: 'lane:b2', startAt: 30 }),
      expect.objectContaining({ laneId: 'lane:b3', startAt: 30 }),
    ]);
  });

  it('should make the units pinned on one building one after another', () => {
    const barracks = [building(BARRACKS.id, 0, 'b1'), building(BARRACKS.id, 0, 'b2')];
    const sentinels = [unit(SENTINEL.id, 'b1'), unit(SENTINEL.id, 'b1'), unit(SENTINEL.id, 'b1')];
    const result = simulate(barracks, sentinels, withBank(10_000, 10_000));

    expect(sentinels.map((sentinel) => orderOf(result, sentinel).startAt)).toEqual([30, 66, 102]);
    expect(result.lanes.map(({ label }) => label)).toEqual(['Base', 'Barracks #1', 'Barracks #2']);
  });
});

describe('Simulation: unit times', () => {
  // 6 Hexite / s from 0 Hexite; a harvester paid 30 Hexite, made in 10 s at the base.
  const PAID_HARVESTER = entity('unit/paid-harvester', {
    category: 'harvester',
    cost: { hexite: 30, flux: 0 },
    duration: 10,
    producedBy: [BASE.id],
  });
  const twoBarracks = () => [building(BARRACKS.id, 0), building(BARRACKS.id, 0)];

  it('should make the harvesters first without a time: units go before the buildings', () => {
    const barracks = twoBarracks();
    const harvesters = [unit(PAID_HARVESTER.id), unit(PAID_HARVESTER.id)];
    const result = simulate(barracks, harvesters, withEntities([PAID_HARVESTER]));

    expect(orderOf(result, harvesters[0]).startAt).toBeLessThan(orderOf(result, barracks[0]).startAt ?? 0);
  });

  it('should start two Barracks before two harvesters placed after their clicks (Kieirra 2026-11-19)', () => {
    const barracks = twoBarracks();
    const harvesters = [recruit(PAID_HARVESTER.id, 25), recruit(PAID_HARVESTER.id, 25)];
    const result = simulate(barracks, harvesters, withEntities([PAID_HARVESTER]));

    expect([...barracks, ...harvesters].map((step) => orderOf(result, step).startAt)).toEqual([10, 20, 25, 35]);
    expect(orderOf(result, harvesters[0]).clickAt).toBe(25);
  });

  it('should let a unit without a time pass a unit of its lane whose time has not come', () => {
    const later = recruit(SENTINEL.id, 100, 'b1');
    const now = unit(SENTINEL.id, 'b1');
    const result = simulate([building(BARRACKS.id, 0, 'b1')], [later, now], withBank(10_000, 10_000));

    expect([orderOf(result, now).startAt, orderOf(result, later).startAt]).toEqual([30, 100]);
  });
});

describe('Simulation: mercenary recruits', () => {
  it('should not recruit before its click time, even with a slot and the money', () => {
    const late = recruit(CORSAIR.id, 40);
    const result = simulate([building(MERCENARY_HALL.id, 0)], [late], withEntities([MERCENARY_HALL, CORSAIR]));

    expect(orderOf(result, late)).toMatchObject({ clickAt: 40, startAt: 40 });
  });

  it('should recruit as soon as possible without a click time, then wait for the next slot', () => {
    const first = recruit(CORSAIR.id);
    const second = recruit(CORSAIR.id);
    const result = simulate([building(MERCENARY_HALL.id, 0)], [first, second], withEntities([MERCENARY_HALL, CORSAIR]));

    expect([orderOf(result, first).startAt, orderOf(result, second).startAt]).toEqual([10, 30]);
  });
});
