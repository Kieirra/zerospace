import { describe, expect, it } from 'vitest';
import { simulateReal as simulate, toBuild } from './engine.wiki-fixtures.ts';
import type { SimulationResult } from './engine.types.ts';

const SUPPLY_PLATFORM = 'protectorate/building/supply-platform';
const BARRACKS = 'protectorate/building/barracks';
const COMMANDO = 'protectorate/unit/commando';

const COMMANDOS = Array<string>(5).fill(COMMANDO);

// Supply Platform 'b1', Barracks 'b2' and 'b3', Commandos 'u1' to 'u5' in Auto.
const twoBarracks = (secondAt: number) =>
  simulate(toBuild('protectorate', null, [[SUPPLY_PLATFORM, 0], [BARRACKS, 15], [BARRACKS, secondAt]], COMMANDOS));

const commandosOf = (result: SimulationResult) => result.orders.filter(({ entityId }) => entityId === COMMANDO);

const readyAt = (result: SimulationResult, laneId: string) => result.lanes.find(({ id }) => id === laneId)?.readyAt ?? Infinity;

// Auto (Kieirra 2026-11-19): each unit goes to the first built Barracks whose production thread is free, in lane order.
describe('Units spread over the buildings that make them', () => {
  it('should alternate when both Barracks are ready together', () => {
    const result = twoBarracks(15);

    expect(commandosOf(result).map(({ laneId }) => laneId)).toEqual(['lane:b2', 'lane:b3', 'lane:b2', 'lane:b3', 'lane:b2']);
    expect(commandosOf(result).map(({ clickAt }) => clickAt).slice(0, 2)).toEqual([readyAt(result, 'lane:b2'), readyAt(result, 'lane:b3')]);
  });

  it('should keep using the first Barracks until the second one is built', () => {
    const result = twoBarracks(60);
    const secondReady = readyAt(result, 'lane:b3');
    const onSecond = commandosOf(result).filter(({ laneId }) => laneId === 'lane:b3');

    expect(commandosOf(result).filter(({ clickAt }) => (clickAt ?? Infinity) < secondReady).every(({ laneId }) => laneId === 'lane:b2')).toBe(true);
    expect(onSecond[0]).toMatchObject({ clickAt: secondReady, startAt: secondReady, waits: {} });
  });

  it('should never make two units at once in one Barracks', () => {
    const result = twoBarracks(15);

    for (const laneId of ['lane:b2', 'lane:b3']) {
      const onLane = commandosOf(result).filter((order) => order.laneId === laneId);
      onLane.slice(1).forEach((order, index) => expect(order.clickAt).toBeGreaterThanOrEqual(onLane[index].endAt ?? Infinity));
    }
  });

  it('should not queue a unit before one of its buildings is ready', () => {
    const result = twoBarracks(15);

    expect(commandosOf(result)[0].clickAt).toBe(Math.min(readyAt(result, 'lane:b2'), readyAt(result, 'lane:b3')));
  });

  it('should keep the units pinned on the second Barracks for it', () => {
    const build = toBuild('protectorate', null, [[SUPPLY_PLATFORM, 0], [BARRACKS, 15], [BARRACKS, 60]], COMMANDOS);
    const result = simulate({ ...build, queued: build.queued.map((step) => ({ ...step, producerUid: 'b3' })) });

    expect(commandosOf(result).every(({ laneId }) => laneId === 'lane:b3')).toBe(true);
    expect(commandosOf(result)[0].clickAt).toBe(readyAt(result, 'lane:b3'));
    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  });
});
