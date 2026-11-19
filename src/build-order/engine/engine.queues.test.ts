import { describe, expect, it } from 'vitest';
import {
  BARRACKS,
  BASE,
  COMMANDO,
  ENTITIES,
  LAB,
  SENTINEL,
  WORKER,
  building,
  codesOf,
  context,
  entity,
  messagesOf,
  orderOf,
  simulate,
  unit,
  withBank,
} from './engine.fixtures.ts';
import { BASE_UID } from '../build-order.types.ts';
import type { BuildEntity } from '../build-order.types.ts';

const withEntities = (extra: BuildEntity[]) => context({ entities: [...ENTITIES, ...extra] });

describe('Simulation: buildings and lanes', () => {
  it('should build two instances clicked together, paid one after the other', () => {
    const result = simulate([building(BARRACKS.id, 0, 'b1'), building(BARRACKS.id, 0, 'b2')]);

    expect(result.orders.map(({ startAt, laneId }) => [startAt, laneId])).toEqual([
      [10, 'lane:b1'],
      [20, 'lane:b2'],
    ]);
    expect(result.lanes.map(({ label }) => label)).toEqual(['Base', 'Barracks #1', 'Barracks #2']);
    expect(result.lanes[2]).toMatchObject({ isStarting: false, startAt: 20, readyAt: 50 });
  });

  it('should name a lone building without a number', () => {
    expect(simulate([building(BARRACKS.id, 0)]).lanes.map(({ label }) => label)).toEqual(['Base', 'Barracks']);
  });

  it('should number the lanes by click time, not by place in the list', () => {
    const result = simulate([building(BARRACKS.id, 50, 'late'), building(BARRACKS.id, 0, 'early')]);

    expect(result.lanes.find(({ id }) => id === 'lane:early')?.label).toBe('Barracks #1');
    expect(result.lanes.find(({ id }) => id === 'lane:late')?.label).toBe('Barracks #2');
  });

  // The second Commando needs the Lab, ready at 1:00: the Barracks waits 10 s with nothing to make.
  it('should count the idle time of a producer between two orders', () => {
    const lateCommando = entity('unit/late-commando', { producedBy: [BARRACKS.id], requires: [LAB.id] });
    const result = simulate(
      [building(BARRACKS.id, 0, 'barracks'), building(LAB.id, 40)],
      [unit(COMMANDO.id), unit(lateCommando.id)],
      withEntities([lateCommando]),
    );

    expect(result.lanes.find(({ id }) => id === 'lane:barracks')?.idle).toEqual([{ from: 50, to: 60 }]);
  });
});

describe('Simulation: pinned and Auto units', () => {
  it('should give an Auto unit to a free building while the pinned ones wait for theirs', () => {
    const pinned = [unit(SENTINEL.id, 'b1'), unit(SENTINEL.id, 'b1')];
    const commando = unit(COMMANDO.id);
    const result = simulate([building(BARRACKS.id, 0, 'b1'), building(BARRACKS.id, 0, 'b2')], [...pinned, commando], withBank(10_000, 10_000));

    expect(orderOf(result, commando)).toMatchObject({ laneId: 'lane:b2', startAt: 30 });
    expect(orderOf(result, pinned[1])).toMatchObject({ laneId: 'lane:b1', clickAt: 66, startAt: 66 });
  });

  it('should accept a unit pinned on the starting base', () => {
    const worker = unit(WORKER.id, BASE_UID);
    const result = simulate([], [worker]);

    expect(codesOf(result, worker)).toEqual([]);
    expect(orderOf(result, worker).laneId).toBe('lane:base');
  });

  it('should report a unit pinned on a lane that cannot make it and run it in Auto', () => {
    const commando = unit(COMMANDO.id, 'lab');
    const result = simulate([building(BARRACKS.id, 0, 'barracks'), building(LAB.id, 0, 'lab')], [commando]);

    expect(codesOf(result, commando)).toEqual(['wrong-producer']);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wrong-producer', severity: 'error', message: "Lab can't make this unit.", stepUid: commando.uid }),
    );
    expect(orderOf(result, commando)).toMatchObject({ laneId: 'lane:barracks', startAt: 40 });
  });

  it('should report a unit without any building able to make it, shown on the base lane', () => {
    const commando = unit(COMMANDO.id);
    const result = simulate([], [commando]);

    expect(messagesOf(result, commando)).toEqual(['No Barracks to produce this.']);
    expect(orderOf(result, commando).laneId).toBe('lane:base');
  });
});

describe('Simulation: unknown data', () => {
  it('should count an unknown build time as 0:00 and flag it', () => {
    const mystery = entity('building/mystery', { kind: 'building', category: 'building', duration: null });
    const step = building(mystery.id, 0);
    const result = simulate([step], [], withEntities([mystery]));

    expect(messagesOf(result, step)).toEqual(['Build time unknown: counted as 0:00.']);
    expect(orderOf(result, step)).toMatchObject({ startAt: 0, endAt: 0 });
    expect(result.diagnostics.filter(({ severity }) => severity === 'warning')).toHaveLength(1);
  });

  it('should start and end each 0:00 unit of one building in the same tick', () => {
    const blink = entity('unit/blink', { duration: null, producedBy: [BASE.id] });
    const blinks = [unit(blink.id), unit(blink.id), unit(blink.id)];
    const result = simulate([], blinks, withEntities([blink]));

    for (const step of blinks) expect(orderOf(result, step)).toMatchObject({ laneId: 'lane:base', startAt: 0, endAt: 0 });
    expect(messagesOf(result, blinks[0])).toEqual(['Build time unknown: counted as 0:00.']);
  });

  // PO10: no producer in the data, so the unit runs outside any thread, on the base lane.
  it('should place a unit without producer on the base lane', () => {
    const fusion = entity('unit/fusion', { cost: { hexite: 30, flux: 0 } });
    const step = unit(fusion.id);
    const result = simulate([], [step], withEntities([fusion]));

    expect(messagesOf(result, step)).toEqual(['Production rule unknown: timing not checked.']);
    expect(orderOf(result, step)).toMatchObject({ laneId: 'lane:base', clickAt: 0, startAt: 5 });
  });
});
