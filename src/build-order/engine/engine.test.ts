import { describe, expect, it } from 'vitest';
import {
  BARRACKS,
  COMMANDO,
  FLUX_VAULT,
  FREE_BUILDING,
  HARVESTER,
  HEXITE_VAULT,
  SENTINEL,
  SUPPLY_PLATFORM,
  WORKER,
  building,
  context,
  known,
  orderOf,
  rules,
  simulate,
  stepOf,
  unit,
  values,
  withBank,
} from './engine.fixtures.ts';
import { HORIZON_SECONDS } from './engine.constants.ts';

describe('Simulation: earliest start from Hexite (CA1)', () => {
  it('should queue a worker at 0:00 and start it when 60 Hexite are mined', () => {
    const worker = unit(WORKER.id);
    const result = simulate([], [worker]);

    expect(orderOf(result, worker)).toMatchObject({
      laneId: 'lane:base',
      clickAt: 0,
      startAt: 10,
      endAt: 28,
      waits: { hexite: 10 },
    });
    expect(result.endTime).toBe(28);
  });

  it('should take one sample per whole second up to the end, over one minute at least', () => {
    const result = simulate([], [unit(WORKER.id)]);

    expect(result.samples).toHaveLength(61);
    expect(result.samples.at(-1)?.t).toBe(60);
    expect(result.samples[0]).toEqual({ t: 0, hexite: 0, flux: 0, supplyUsed: 0, supplyCap: null });
    expect(result.samples[5].hexite).toBe(30);
    expect(result.samples[10].hexite).toBe(0);
  });
});

describe('Simulation: early click (CA2)', () => {
  // The free harvester (unit class) starts at once, the Barracks at 0:10, the Sentinel waits for 75 Flux.
  const setup = () => {
    const barracks = building(BARRACKS.id, 0, 'barracks');
    const harvester = unit(HARVESTER.id);
    const sentinel = unit(SENTINEL.id);
    return { barracks, harvester, sentinel, result: simulate([barracks], [harvester, sentinel]) };
  };

  it('should queue the Sentinel when the Barracks is ready and start it when the Flux is there', () => {
    const { result, sentinel } = setup();

    expect(orderOf(result, sentinel)).toMatchObject({
      laneId: 'lane:barracks',
      clickAt: 40,
      startAt: 42,
      endAt: 78,
      waits: { flux: 2 },
    });
    expect(stepOf(result, sentinel)).toMatchObject({ clickAt: 40, startAt: 42 });
  });

  it('should not flag an order whose click and start show the same second', () => {
    const free = building(FREE_BUILDING.id, 0);
    const result = simulate([free]);

    expect(stepOf(result, free)).toMatchObject({ clickAt: 0, startAt: 0 });
  });
});

describe('Simulation: production thread (CA3)', () => {
  it('should queue the next unit only when the previous one ends', () => {
    const commandos = [unit(COMMANDO.id), unit(COMMANDO.id)];
    const result = simulate([building(BARRACKS.id, 0)], commandos);

    expect(orderOf(result, commandos[0])).toMatchObject({ clickAt: 40, startAt: 40, endAt: 50 });
    expect(orderOf(result, commandos[1])).toMatchObject({ clickAt: 50, startAt: 50, waits: {} });
  });

  it('should share the Auto units between two Barracks, in lane order', () => {
    const commandos = [unit(COMMANDO.id), unit(COMMANDO.id), unit(COMMANDO.id), unit(COMMANDO.id)];
    const result = simulate([building(BARRACKS.id, 0, 'b1'), building(BARRACKS.id, 0, 'b2')], commandos, withBank(120));

    expect(commandos.map((commando) => orderOf(result, commando).laneId)).toEqual(['lane:b1', 'lane:b2', 'lane:b1', 'lane:b2']);
    expect(commandos.map((commando) => orderOf(result, commando).startAt)).toEqual([30, 30, 40, 40]);
  });
});

describe('Simulation: resource reservation (CA4)', () => {
  // The free harvester mines 25 Flux by 0:22; the Flux Vault comes first in `timed`.
  const setup = (reservation: 'strict' | 'none') => {
    const fluxVault = building(FLUX_VAULT.id, 0);
    const hexiteVault = building(HEXITE_VAULT.id, 0);
    const result = simulate(
      [fluxVault, hexiteVault],
      [unit(HARVESTER.id)],
      context({ values: values({ startingHexite: known(100) }), rules: rules(reservation) }),
    );
    return { result, fluxVault, hexiteVault };
  };

  it('should hold an affordable order behind an earlier one waiting for Flux when strict', () => {
    const { result, fluxVault, hexiteVault } = setup('strict');

    expect(orderOf(result, fluxVault)).toMatchObject({ clickAt: 0, startAt: 22, waits: { flux: 22 } });
    expect(orderOf(result, hexiteVault)).toMatchObject({ clickAt: 0, startAt: 22, waits: { reserved: 22 } });
  });

  it('should start the affordable order at once without reservation', () => {
    const { result, fluxVault, hexiteVault } = setup('none');

    expect(orderOf(result, fluxVault).startAt).toBe(22);
    expect(orderOf(result, hexiteVault)).toMatchObject({ clickAt: 0, startAt: 0, waits: {} });
  });
});

describe('Simulation: supply (CA6, CA7)', () => {
  it('should not check the supply when the starting supply is unknown', () => {
    const result = simulate([building(BARRACKS.id, 0)], [unit(COMMANDO.id), unit(COMMANDO.id), unit(COMMANDO.id)]);

    expect(result.supply).toEqual({ used: 6, cap: null, isChecked: false });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'supply-not-checked', severity: 'info' }));
    expect(result.orders.some(({ waits }) => waits.supply !== undefined)).toBe(false);
  });

  // Barracks ready at 0:10, Commandos of 5 s, 4 supply at start, +12 when the Supply Platform is done at 0:30.
  const supplyContext = () => {
    const entities = [{ ...BARRACKS, duration: 10 }, SUPPLY_PLATFORM, { ...COMMANDO, duration: 5 }];
    return context({
      entities: [...context().factionEntities.filter(({ id }) => !entities.some((other) => other.id === id)), ...entities],
      values: values({ startingHexite: known(1000), startingSupply: known(4) }),
    });
  };

  it('should hold the 3rd Commando until the Supply Platform is done', () => {
    const commandos = [unit(COMMANDO.id), unit(COMMANDO.id), unit(COMMANDO.id)];
    const result = simulate([building(BARRACKS.id, 0), building(SUPPLY_PLATFORM.id, 0)], commandos, supplyContext());

    expect(orderOf(result, commandos[2])).toMatchObject({ clickAt: 20, startAt: 30, waits: { supply: 10 } });
    expect(result.supply).toEqual({ used: 6, cap: 16, isChecked: true });
    expect(result.diagnostics.map(({ code }) => code)).not.toContain('supply-not-checked');
  });

  it('should never start a unit over the cap when no supply comes', () => {
    const commandos = [unit(COMMANDO.id), unit(COMMANDO.id), unit(COMMANDO.id)];
    const result = simulate([building(BARRACKS.id, 0)], commandos, supplyContext());

    expect(orderOf(result, commandos[2])).toMatchObject({ startAt: null, endAt: null });
    expect(stepOf(result, commandos[2]).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'never-starts', message: 'Never starts: no supply left (4/4).' }),
    );
  });
});

describe('Simulation: horizon', () => {
  it('should count the wait of an order never started up to the horizon, not past it', () => {
    const vault = building(FLUX_VAULT.id, 0);

    expect(orderOf(simulate([vault]), vault)).toMatchObject({ clickAt: 0, startAt: null, waits: { flux: HORIZON_SECONDS } });
  });
});

describe('Simulation: empty build', () => {
  it('should end at 0:00 with its resource curves over the first minute', () => {
    const result = simulate([]);

    expect(result).toMatchObject({ endTime: 0, steps: [], orders: [] });
    expect(result.samples).toHaveLength(61);
    expect(result.samples.at(-1)?.t).toBe(60);
  });
});
