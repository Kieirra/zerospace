import { describe, expect, it } from 'vitest';
import { HORIZON_SECONDS } from './engine.constants.ts';
import {
  BARRACKS,
  COMMANDO,
  ENTITIES,
  FLUX_VAULT,
  HARVESTER,
  LAB,
  SENTINEL,
  WORKER,
  building,
  codesOf,
  context,
  entity,
  known,
  orderOf,
  simulate,
  unit,
  withBank,
} from './engine.fixtures.ts';
import { BASE_UID } from '../build-order.types.ts';
import type { QueuedStep } from '../build-order.types.ts';
import type { SimulationResult } from './engine.types.ts';

const loop = (entityId: string, producerUid?: string): QueuedStep => ({ ...unit(entityId, producerUid), repeat: true });

// Every order of a step, the step itself first, then the copies of its loop.
const runsOf = (result: SimulationResult, step: { uid: string }) =>
  result.orders.filter(({ stepUid }) => stepUid === step.uid).map(({ occurrence, startAt, endAt }) => [occurrence, startAt, endAt]);

const lastSampleOf = (result: SimulationResult) => result.samples.at(-1)?.t;

describe('Simulation: loops (D6)', () => {
  // Commandos take 10 s on the Barracks, ready at 0:30; the 3 Workers end at 0:54.
  it('should stop a loop at the end of the last queued step, the copy in production finished', () => {
    const commando = loop(COMMANDO.id, 'barracks');
    const result = simulate(
      [building(BARRACKS.id, 0, 'barracks')],
      [commando, unit(WORKER.id, BASE_UID), unit(WORKER.id, BASE_UID), unit(WORKER.id, BASE_UID)],
      withBank(1000),
    );

    expect(runsOf(result, commando)).toEqual([
      [0, 30, 40],
      [1, 40, 50],
      [2, 50, 60],
    ]);
    expect(result.endTime).toBe(60);
    expect(lastSampleOf(result)).toBe(60);
  });

  // 150 Flux and no income: 2 Sentinels, then the next copy waits in the Barracks until the Lab ends at 2:00.
  it('should cancel the copy still waiting at the end of the last step, and end the simulation', () => {
    const sentinel = loop(SENTINEL.id, 'barracks');
    const result = simulate([building(BARRACKS.id, 0, 'barracks'), building(LAB.id, 100, 'lab')], [sentinel], withBank(1000, 150));

    expect(runsOf(result, sentinel)).toEqual([
      [0, 30, 66],
      [1, 66, 102],
    ]);
    expect(result.endTime).toBe(120);
    expect(lastSampleOf(result)).toBe(120);
  });

  // 75 Flux a minute: the copy released at 1:42 waits for its Flux and, a unit, holds the Lab clicked at 1:45.
  it('should hold a building behind a copy that waits for its resources, as any unit', () => {
    const withIncome = withBank(1000, 75, { passiveFluxPerMin: known(75) });
    const sentinel = loop(SENTINEL.id, 'barracks');
    const lab = building(LAB.id, 105, 'lab');
    const result = simulate([building(BARRACKS.id, 0, 'barracks'), lab], [sentinel], withIncome);
    const third = result.orders.find(({ stepUid, occurrence }) => stepUid === sentinel.uid && occurrence === 2);

    expect(third?.startAt).toBeGreaterThan(105);
    expect(orderOf(simulate([building(BARRACKS.id, 0, 'barracks'), lab], [], withIncome), lab).startAt).toBe(105);
    expect(orderOf(result, lab).startAt).toBe(third?.startAt);
  });

  // The Lab ends at 1:20, in the very tick the fifth Commando of each Barracks ends: no copy after it.
  it('should loop on two buildings at once, one loop each', () => {
    const first = loop(COMMANDO.id, 'b1');
    const second = loop(COMMANDO.id, 'b2');
    const result = simulate(
      [building(BARRACKS.id, 0, 'b1'), building(BARRACKS.id, 0, 'b2'), building(LAB.id, 60)],
      [first, second],
      withBank(1000),
    );
    const startsOf = (step: QueuedStep) => runsOf(result, step).map(([, startAt]) => startAt);

    expect(startsOf(first)).toEqual([30, 40, 50, 60, 70]);
    expect(startsOf(second)).toEqual([30, 40, 50, 60, 70]);
    expect(result.orders.filter(({ occurrence }) => occurrence > 0).every(({ laneId }) => laneId !== null)).toBe(true);
    expect(result.orders.find(({ stepUid, occurrence }) => stepUid === second.uid && occurrence === 4)?.laneId).toBe('lane:b2');
  });

  it('should make a unit without duration, a harvester or a unit without building once, never in a loop', () => {
    const instant = entity('unit/instant', { duration: 0, producedBy: [BARRACKS.id] });
    const orphan = entity('unit/orphan');
    const steps = [loop(instant.id, 'barracks'), loop(HARVESTER.id, BASE_UID), loop(orphan.id)];
    const result = simulate(
      [building(BARRACKS.id, 0, 'barracks'), building(LAB.id, 60)],
      steps,
      context({ entities: [...ENTITIES, instant, orphan] }),
    );

    expect(steps.map((step) => runsOf(result, step).length)).toEqual([1, 1, 1]);
    expect(result.endTime).toBe(80);
  });

  // The Flux Vault never gets its Flux: the loop runs up to the horizon, which ends the simulation.
  it('should loop up to the horizon while a step outside the loops never ends', () => {
    const commando = loop(COMMANDO.id, 'barracks');
    const vault = building(FLUX_VAULT.id, 0);
    const result = simulate([building(BARRACKS.id, 0, 'barracks'), vault], [commando], withBank(1000));

    expect(codesOf(result, vault)).toContain('never-starts');
    expect(lastSampleOf(result)).toBe(HORIZON_SECONDS);
    expect(runsOf(result, commando).at(-1)).toEqual([(HORIZON_SECONDS - 30) / 10, HORIZON_SECONDS, HORIZON_SECONDS + 10]);
  });

  it('should keep the step timing on the step itself', () => {
    const commando = loop(COMMANDO.id, 'barracks');
    const result = simulate([building(BARRACKS.id, 0, 'barracks'), building(LAB.id, 30)], [commando], withBank(1000));

    expect(result.steps.find(({ stepUid }) => stepUid === commando.uid)).toMatchObject({ startAt: 30, endAt: 40 });
    expect(runsOf(result, commando)).toHaveLength(2);
  });
});
