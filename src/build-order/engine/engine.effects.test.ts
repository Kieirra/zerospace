import { describe, expect, it } from 'vitest';
import { analyzeBuild } from './engine.analysis.ts';
import { MISC_LANE_ID } from './engine.constants.ts';
import { applyDueEffects } from './engine.effects.ts';
import { createState } from './engine.state.ts';
import { simulateBuild } from './engine.ts';
import {
  ENTITIES,
  HARVESTER,
  LAB,
  build,
  building,
  codesOf,
  context,
  entity,
  freeUnitsOf,
  known,
  miscEntity,
  orderOf,
  simulate,
  stepOf,
  unit,
  unknown,
  values,
} from './engine.fixtures.ts';
import type { BuildEntity } from '../build-order.types.ts';
import type { SimulationResult } from './engine.types.ts';

const RESEARCHES = { categories: ['research' as const] };
const EFFICIENT_UPGRADES = miscEntity('talent/efficient-upgrades', 'talent', [
  { kind: 'cost', target: RESEARCHES, multiplier: 0.6 },
  { kind: 'duration', target: RESEARCHES, multiplier: 1 / 1.4 },
]);
const RAPID_GERMINATION = miscEntity('talent/rapid-germination', 'talent', [
  { kind: 'duration', target: { categories: ['building', 'mercenary-building'] }, multiplier: 1 / 1.35 },
]);
const LORE_OF_FLUX = miscEntity('talent/lore-of-flux', 'talent', [
  { kind: 'spawn-harvesters' },
  { kind: 'flux-income', percent: 10 },
]);
const GUARDS = miscEntity('event/tower-xp-creeps', 'event', [{ kind: 'grant', hexite: 40, flux: 0 }]);
// Battle Frenzy: 100 Flux, 40 s.
const BATTLE_FRENZY = entity('upgrade/battle-frenzy', {
  kind: 'upgrade',
  category: 'research',
  cost: { hexite: 0, flux: 100 },
  duration: 40,
  requires: [LAB.id],
});
// 200 Flux: longer to gather than the Lab takes to build.
const OVERDRIVE = entity('upgrade/overdrive', {
  kind: 'upgrade',
  category: 'research',
  cost: { hexite: 0, flux: 200 },
  duration: 10,
  requires: [LAB.id],
});

const withMisc = (overrides: Parameters<typeof values>[0] = {}, extra: BuildEntity[] = []) =>
  context({
    entities: [...ENTITIES, EFFICIENT_UPGRADES, RAPID_GERMINATION, LORE_OF_FLUX, GUARDS, BATTLE_FRENZY, ...extra],
    values: values(overrides),
  });

const sampleAt = (result: SimulationResult, second: number) => {
  const sample = result.samples.find(({ t }) => t === second);
  if (!sample) throw new Error(`No sample at ${second}`);
  return sample;
};

describe('Misc steps: cost and duration (CA2)', () => {
  it('should cost 60 Flux and last 28.6 s when Efficient Upgrades is applied before the research starts', () => {
    const frenzy = building(BATTLE_FRENZY.id, 30);
    const talent = building(EFFICIENT_UPGRADES.id, 10);

    const result = simulate([building(LAB.id, 0), talent, frenzy], [], withMisc({ startingFlux: known(1000) }));

    expect(orderOf(result, frenzy)).toMatchObject({ startAt: 30, endAt: 58.6 });
    expect(sampleAt(result, 30).flux).toBe(940);
    expect(stepOf(result, talent)).toMatchObject({ clickAt: 10, startAt: 10, endAt: 10, laneId: MISC_LANE_ID, diagnostics: [] });
  });

  it('should keep the full cost and time when Efficient Upgrades comes after the research started', () => {
    const frenzy = building(BATTLE_FRENZY.id, 30);

    const result = simulate([building(LAB.id, 0), building(EFFICIENT_UPGRADES.id, 40), frenzy], [], withMisc({ startingFlux: known(1000) }));

    expect(orderOf(result, frenzy)).toMatchObject({ startAt: 30, endAt: 70 });
    expect(sampleAt(result, 30).flux).toBe(900);
  });

  it('should start a waiting research when the reduced cost is in the bank', () => {
    const frenzy = building(BATTLE_FRENZY.id, 25);

    const result = simulate([building(LAB.id, 0), frenzy, building(EFFICIENT_UPGRADES.id, 50)], [], withMisc({ startingFlux: known(70) }));

    expect(orderOf(result, frenzy)).toMatchObject({ startAt: 50, endAt: 78.6, waits: { flux: 25 } });
  });

  // 1 Flux / s: 20 Flux when the Lab ends at 0:20, the 60 Flux of the reduced cost at 1:00.
  it('should start a research as soon as its reduced cost is gathered when Efficient Upgrades came before', () => {
    const frenzy = building(BATTLE_FRENZY.id, 0);

    const result = simulate(
      [building(LAB.id, 0), building(EFFICIENT_UPGRADES.id, 0), frenzy],
      [],
      withMisc({ passiveFluxPerMin: known(60) }),
    );

    expect(orderOf(result, frenzy)).toMatchObject({ startAt: 60, waits: { flux: 40 } });
  });

  it('should keep the time of a building already under construction when Rapid Germination comes', () => {
    const first = building(LAB.id, 0);
    const second = building(LAB.id, 10);

    const result = simulate([first, building(RAPID_GERMINATION.id, 5), second], [], withMisc());

    expect(orderOf(result, first)).toMatchObject({ startAt: 0, endAt: 20 });
    expect(orderOf(result, second)).toMatchObject({ startAt: 10, endAt: 24.8 });
  });
});

describe('Misc steps: harvesters and Flux (CA3)', () => {
  it('should spawn a Flux node of free harvesters on the Misc lane and raise the Flux income when Lore of Flux applies', () => {
    const lore = building(LORE_OF_FLUX.id, 60);
    const harvesters = [unit(HARVESTER.id), unit(HARVESTER.id), unit(HARVESTER.id)];

    const result = simulateBuild(build([lore], harvesters), withMisc(), { minSampledSeconds: 70 });

    expect(freeUnitsOf(result, lore)).toEqual([
      expect.objectContaining({ entityId: HARVESTER.id, occurrence: 1, laneId: MISC_LANE_ID, startAt: 60 }),
      expect.objectContaining({ entityId: HARVESTER.id, occurrence: 2, laneId: MISC_LANE_ID, startAt: 60 }),
    ]);
    expect(sampleAt(result, 60).flux - sampleAt(result, 59).flux).toBeCloseTo(7.5);
    expect(sampleAt(result, 62).flux - sampleAt(result, 61).flux).toBeCloseTo(5 * 2.5 * 1.1);
  });

  // 2 free harvesters: 5 Flux / s × 1.1 = 0.55 Flux a tick, the 200 Flux gathered at 36.4 s.
  it('should start a research waiting for Flux as soon as the raised Flux income has gathered its cost', () => {
    const overdrive = building(OVERDRIVE.id, 0);

    const result = simulate([building(LAB.id, 0), building(LORE_OF_FLUX.id, 0), overdrive], [], withMisc({}, [OVERDRIVE]));

    expect(orderOf(result, overdrive).startAt).toBe(36.4);
  });

  it('should spawn a Flux node of harvesters when the harvester cap is unknown', () => {
    const lore = building(LORE_OF_FLUX.id, 10);

    const result = simulate([lore], [unit(HARVESTER.id)], withMisc({ maxFluxNodes: unknown() }));

    expect(freeUnitsOf(result, lore)).toHaveLength(2);
  });

  it('should reserve a Flux node under the harvester cap when Lore of Flux is in the build', () => {
    const harvesters = [unit(HARVESTER.id), unit(HARVESTER.id), unit(HARVESTER.id)];

    const result = simulate([building(LORE_OF_FLUX.id, 120)], harvesters, withMisc({ maxFluxNodes: known(2) }));

    expect(harvesters.map((harvester) => codesOf(result, harvester).includes('harvester-cap'))).toEqual([false, false, true]);
  });

  it('should spawn no harvester but still raise the Flux income when the cap is reached', () => {
    const simulationContext = withMisc({ maxFluxNodes: known(1) });
    const plans = analyzeBuild(build([building(LORE_OF_FLUX.id, 0)]), simulationContext, { setup: null, maxSlots: 0 });
    const state = createState(plans, simulationContext);
    state.harvesters.push(HARVESTER, HARVESTER);

    applyDueEffects(state, simulationContext);

    expect(state.harvesters).toHaveLength(2);
    expect(state.effects[0]).toMatchObject({ appliedTick: 0, spawns: [] });
    expect(state.modifiers.fluxIncomePercent).toBe(10);
  });

  it('should ignore the second copy of a talent when it is in the build twice', () => {
    const first = building(LORE_OF_FLUX.id, 10);
    const second = building(LORE_OF_FLUX.id, 20);

    const result = simulate([first, second], [], withMisc());

    expect(stepOf(result, second).diagnostics).toEqual([
      { code: 'duplicate-talent', severity: 'error', message: 'Already in the build.', stepUid: second.uid },
    ]);
    expect(result.orders.filter(({ entityId }) => entityId === HARVESTER.id)).toHaveLength(2);
  });

  it('should keep the ignored copy of a talent on the Misc lane at its time, never applied', () => {
    const first = building(LORE_OF_FLUX.id, 10);
    const second = building(LORE_OF_FLUX.id, 20);

    const result = simulate([first, second], [], withMisc());

    expect(result.orders.filter(({ stepUid }) => stepUid === second.uid)).toEqual([
      { stepUid: second.uid, entityId: LORE_OF_FLUX.id, occurrence: 0, laneId: MISC_LANE_ID, clickAt: 20, startAt: null, endAt: null, waits: {} },
    ]);
    expect(stepOf(result, second)).toMatchObject({ clickAt: 20, startAt: null, endAt: null, laneId: MISC_LANE_ID });
  });
});

describe('Misc steps: Tower XP creeps (CA4)', () => {
  it('should add 40 Hexite at each guards time when they are placed with no limit', () => {
    const times = [60, 90, 120, 120];

    const result = simulate(
      times.map((at) => building(GUARDS.id, at)),
      [],
      withMisc(),
    );

    expect([60, 90, 120].map((second) => sampleAt(result, second).hexite)).toEqual([6 * 60 + 40, 6 * 90 + 80, 6 * 120 + 160]);
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'supply-not-checked' })]);
  });
});
