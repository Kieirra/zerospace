import { describe, expect, it } from 'vitest';
import {
  collectIncome,
  createHexiteMine,
  getFluxPerTick,
  getMaxHarvesters,
  getStartingWorkers,
  getSupplyCap,
  isSupplyChecked,
  mineHexite,
} from './engine.economy.ts';
import { addInstance, createState } from './engine.state.ts';
import { BASE, ENTITIES, HARVESTER, SUPPLY_PLATFORM, context, entity, known, unknown, values } from './engine.fixtures.ts';
import type { HexiteBaseEconomy } from '../build-order.types.ts';

const ECONOMY: HexiteBaseEconomy = {
  kind: 'hexite-base',
  workers: 6,
  hexitePerWorkerPerMin: 60,
  workerSpawnSeconds: 10,
  pitHexite: 1_000_000,
  depletedRatePercent: 25,
};

// Hexite mined over [from, to) ticks.
const mine = (mineState: ReturnType<typeof createHexiteMine>, from: number, to: number) => {
  let total = 0;
  for (let tick = from; tick < to; tick += 1) total += mineHexite(mineState, tick);
  return Math.round(total * 1000) / 1000;
};

describe('Economy: Hexite', () => {
  it('should mine 6 Hexite per second with a full base', () => {
    expect(mine(createHexiteMine(ECONOMY, 0, 6), 0, 10)).toBe(6);
  });

  it('should start a full base from the confirmed starting workers', () => {
    expect(getStartingWorkers(ECONOMY, values({ startingHexiteWorkers: known('full') }))).toBe(6);
    expect(getStartingWorkers(ECONOMY, values({ startingHexiteWorkers: known(2) }))).toBe(2);
  });

  it('should give a new base its first worker one spawn time after it is ready', () => {
    const newBase = createHexiteMine(ECONOMY, 100);

    expect(mine(newBase, 100, 200)).toBe(0);
    expect(mine(newBase, 200, 210)).toBe(1);
    expect(mine(newBase, 300, 310)).toBe(2);
  });

  it('should handle a spawn time to the tenth of a second (Xol, 33.5 s)', () => {
    const xol = createHexiteMine({ ...ECONOMY, workers: 4, hexitePerWorkerPerMin: 84, workerSpawnSeconds: 33.5 }, 0);

    expect(mine(xol, 0, 335)).toBe(0);
    expect(xol.workers).toBe(0);
    mineHexite(xol, 335);
    expect(xol.workers).toBe(1);
    expect(mine(xol, 336, 670)).toBe(46.76);
    expect(xol.workers).toBe(1);
    mineHexite(xol, 670);
    expect(xol.workers).toBe(2);
  });

  it('should mine the depleted share once the pit is empty', () => {
    const smallPit = createHexiteMine({ ...ECONOMY, pitHexite: 1 }, 0, 6);

    expect(mineHexite(smallPit, 0)).toBe(0.6);
    expect(mineHexite(smallPit, 1)).toBe(0.4);
    expect(smallPit.pitRemaining).toBe(0);
    expect(mineHexite(smallPit, 2)).toBe(0.15);
  });
});

describe('Economy: Flux and passive income', () => {
  it('should mine Flux with each harvester', () => {
    expect(getFluxPerTick([HARVESTER, HARVESTER])).toBe(0.5);
    expect(getFluxPerTick([])).toBe(0);
  });

  it('should limit harvesters to the Flux nodes times the harvesters per node', () => {
    expect(getMaxHarvesters(HARVESTER, values())).toEqual({ max: 8, nodes: 4, perNode: 2 });
    expect(getMaxHarvesters(HARVESTER, values({ maxFluxNodes: unknown() }))).toBeUndefined();
    expect(getMaxHarvesters(entity('unit/no-economy', { category: 'harvester' }), values())).toBeUndefined();
  });

  it('should add the passive income read from the game values', () => {
    const passiveContext = context({
      values: values({ passiveHexitePerMin: known(60), passiveFluxPerMin: known(30), startingHexite: known(0) }),
    });
    const state = createState([], passiveContext);
    state.instances = [];
    collectIncome(state, passiveContext);

    expect(state.bank).toEqual({ hexite: 0.1, flux: 0.05 });
  });
});

describe('Economy: supply', () => {
  const supplyContext = (startingSupply: number | null, cap: number | null = null) =>
    context({
      values: values({
        startingSupply: startingSupply === null ? unknown() : known(startingSupply),
        supplyCap: cap === null ? unknown() : known(cap),
      }),
    });

  it('should only check the supply when every amount is known', () => {
    expect(isSupplyChecked(values({ startingSupply: known(10) }), ENTITIES)).toBe(true);
    expect(isSupplyChecked(values(), ENTITIES)).toBe(false);
    expect(isSupplyChecked(values({ startingSupply: known(10) }), [...ENTITIES, { ...BASE, supplyProvided: null }])).toBe(
      false,
    );
  });

  it('should add the supply of finished buildings, not the starting base, under the cap', () => {
    const checked = supplyContext(10);
    const state = createState([], checked);
    const platform = addInstance(state, SUPPLY_PLATFORM, 'platform', 0, 300);

    expect(getSupplyCap(state.instances, checked)).toBe(10);
    platform.isComplete = true;
    expect(getSupplyCap(state.instances, checked)).toBe(22);
    expect(getSupplyCap(state.instances, supplyContext(10, 15))).toBe(15);
    expect(getSupplyCap(state.instances, supplyContext(null))).toBeNull();
  });
});
