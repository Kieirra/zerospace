import { describe, expect, it } from 'vitest';
import { REPLICATE_UID } from '../build-order.types.ts';
import { simulateBuild } from './engine.ts';
import { toXolBuild, toXolContext } from './engine.wiki-fixtures.ts';
import type { Build } from '../build-order.types.ts';
import type { SimulationResult } from './engine.types.ts';

// Replicate (US-009): one step, one copy of one Xol unit; energy only, the supply of one unit, stunned 16 s.
const ID = (path: string) => `the-xol/${path}`;
const SYNAPSE = ID('unit/synapse');

// Producers ready 0:55, Molten Core ready 1:35: the Synapse merges at 1:35 and is ready at 1:45.7.
const TIMED: [string, number][] = [
  [ID('building/power-core'), 0],
  [ID('building/spectral-foundry'), 5],
  [ID('building/molten-core'), 55],
];
const SPECTRONS = [{ entityId: ID('unit/spectron') }, { entityId: ID('unit/spectron') }];
const COPY = { entityId: SYNAPSE, producerUid: REPLICATE_UID };

const simulate = (build: Build) => simulateBuild(build, toXolContext(build));

const orderOf = (result: SimulationResult, stepUid: string) => {
  const order = result.orders.find((timing) => timing.stepUid === stepUid);
  if (!order) throw new Error(`No order ${stepUid}`);
  return order;
};

const supplyAt = (result: SimulationResult, second: number) => result.samples.find(({ t }) => t === second)?.supplyUsed ?? Number.NaN;

describe('Xol Replicate', () => {
  it('should copy a ready Synapse: 4 supply, no resource, 16 s, the energy told (CA8)', () => {
    const result = simulate(toXolBuild(TIMED, [...SPECTRONS, { entityId: SYNAPSE }, { ...COPY, at: 120 }]));
    const synapse = orderOf(result, 'u3');
    const copy = orderOf(result, 'u4');
    const bank = (second: number) => result.samples.find(({ t }) => t === second);

    expect(copy).toMatchObject({ startAt: 120, endAt: 136, laneId: synapse.laneId, energy: 19 });
    expect(supplyAt(result, 121) - supplyAt(result, 119)).toBe(4);
    // No harvester: the Flux stays the same, no Flux is spent.
    expect(bank(121)?.flux).toBe(bank(119)?.flux);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'energy-not-checked', severity: 'info', message: 'Top bar energy not checked: 19 spent by Replicate.' }),
    );
  });

  it('should be stunned 6 s with Efficient Replication (CA8)', () => {
    const build = toXolBuild([...TIMED, [ID('talent/efficient-replication'), 0]], [...SPECTRONS, { entityId: SYNAPSE }, { ...COPY, at: 120 }]);

    expect(orderOf(simulate(build), 'u4')).toMatchObject({ startAt: 120, endAt: 126 });
  });

  it('should wait for its target, then start when it is ready', () => {
    const result = simulate(toXolBuild(TIMED, [...SPECTRONS, COPY, { entityId: SYNAPSE }]));

    expect(orderOf(result, 'u3').startAt).toBe(orderOf(result, 'u4').endAt);
    expect(orderOf(result, 'u3').waits.units).toBeGreaterThan(0);
  });

  it('should never start without a free target, and tell why', () => {
    const result = simulate(toXolBuild(TIMED, [...SPECTRONS, COPY]));
    const step = result.steps.find(({ stepUid }) => stepUid === 'u3');

    expect(step?.startAt).toBeNull();
    expect(step?.diagnostics.map(({ message }) => message)).toEqual(['Never starts: no Synapse to replicate.']);
    expect(step?.laneId).toBe(orderOf(result, 'u1').laneId);
  });

  it('should drop a Replicate step on a unit without energy cost', () => {
    const result = simulate(toXolBuild(TIMED, [{ entityId: ID('unit/scouting-drone'), producerUid: REPLICATE_UID }]));

    expect(result.steps[result.steps.length - 1].diagnostics.map(({ code }) => code)).toEqual(['unknown-entity']);
  });
});
