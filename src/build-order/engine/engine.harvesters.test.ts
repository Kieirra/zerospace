import { describe, expect, it } from 'vitest';
import {
  BARRACKS,
  BASE,
  ENTITIES,
  HARVESTER,
  LAB,
  building,
  context,
  entity,
  hasOrder,
  messagesOf,
  orderOf,
  simulate,
  unit,
  unknown,
  values,
} from './engine.fixtures.ts';

// 6 Hexite / s from 0 Hexite; a harvester paid 30 Hexite, made in 10 s at the base.
const PAID_HARVESTER = entity('unit/paid-harvester', {
  category: 'harvester',
  cost: { hexite: 30, flux: 0 },
  duration: 10,
  producedBy: [BASE.id],
});

const harvesters = (count: number, id = HARVESTER.id) => Array.from({ length: count }, () => unit(id));

describe('Simulation: harvester limit', () => {
  it('should ignore the harvesters over the node limit', () => {
    const steps = harvesters(10);
    const result = simulate([], steps);

    expect(result.orders).toHaveLength(8);
    expect(messagesOf(result, steps[8])).toEqual([
      'Harvester limit reached: at most 8 (4 Flux nodes × 2 per node), extra harvesters are ignored.',
    ]);
    expect(hasOrder(result, steps[9])).toBe(false);
    expect(hasOrder(result, steps[7])).toBe(true);
    expect(result.diagnostics.filter(({ code }) => code === 'harvester-cap')).toHaveLength(2);
  });

  it('should not limit the harvesters when the Flux nodes are unknown', () => {
    const result = simulate([], harvesters(10), context({ values: values({ maxFluxNodes: { ...unknown(), label: 'Flux nodes' } }) }));

    expect(result.orders).toHaveLength(10);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'flux-nodes-unknown',
        message: 'Flux nodes per base unknown: all 10 harvesters are counted as mining.',
      }),
    );
  });

  it('should mine Flux with every finished harvester', () => {
    const result = simulate([], harvesters(2));

    expect(result.orders.map(({ endAt }) => endAt)).toEqual([12, 24]);
    // 12 s of one harvester at 2.5 Flux / s.
    expect(result.samples[24].flux).toBe(30);
  });
});

describe('Simulation: harvesters and buildings in the start priority', () => {
  const withPaid = () => context({ entities: [...ENTITIES, PAID_HARVESTER] });

  // The unit class starts before a building: each harvester is paid first, the Barracks takes the next 60 Hexite.
  it('should pay the harvesters before a Barracks clicked at the same time', () => {
    const barracks = building(BARRACKS.id, 0);
    const [first, second] = harvesters(2, PAID_HARVESTER.id);
    const result = simulate([barracks], [first, second], withPaid());

    expect([first, second, barracks].map((step) => orderOf(result, step).startAt)).toEqual([5, 15, 20]);
    // Never affordable before 0:20: its own lack of Hexite, not a reservation.
    expect(orderOf(result, barracks).waits).toEqual({ hexite: 20 });
  });

  it('should hold a free building behind a base that saves for its Hexite', () => {
    const base = building(BASE.id, 0);
    const lab = building(LAB.id, 0);
    const result = simulate([lab, base], [], withPaid());

    expect(orderOf(result, lab).startAt).toBe(orderOf(result, base).startAt);
    expect(orderOf(result, lab).waits.reserved).toBeGreaterThan(0);
  });
});
