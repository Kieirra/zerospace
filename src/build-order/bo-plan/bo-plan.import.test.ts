import { describe, expect, it } from 'vitest';
import { HORIZON_SECONDS } from '../engine/engine.constants.ts';
import { simulateBuild } from '../engine/engine.ts';
import { getCatalog, simulateReal, toRealContext } from '../engine/engine.wiki-fixtures.ts';
import { MAX_STEPS } from '../link/link.constants.ts';
import { toBuild } from './bo-plan.import.ts';
import type { Build } from '../build-order.types.ts';
import type { BoAnchor, BoGroup, BoItem, BoPlan } from './bo-plan.types.ts';

const IDAL_CONDUIT = 'the-legion/building/idal-conduit';
const BESTIARY = 'the-legion/building/bestiary';
const CITADEL = 'the-legion/building/citadel';
const ALTAR = 'the-legion/building/altar';
const GARRISON_TOWER = 'the-legion/building/garrison-tower';
const LABOURER = 'the-legion/unit/legion-labourer';
const EXALTED = 'the-legion/unit/exalted';
const GALAVAX = 'the-legion/hero/galavax';
const AFTER_PREVIOUS: BoAnchor = { kind: 'after-previous' };

const item = (entityId: string, extra: Partial<BoItem> = {}): BoItem => ({ entityId, count: 1, ...extra });
const group = (items: BoItem[], anchor: BoAnchor = AFTER_PREVIOUS): BoGroup => ({ anchor, items });

const convert = (groups: BoGroup[], heroId: string | null = GALAVAX) => {
  const plan: BoPlan = { factionId: 'the-legion', mercenaryId: null, heroId, title: 'Test', author: 'Kieirra', phases: [{ number: 1, groups }] };
  return toBuild(plan, { faction: getCatalog('the-legion'), mercenary: null });
};

const allSteps = (build: Build) =>
  [...build.timed, ...build.queued].sort((a, b) => Number(a.uid.slice(1)) - Number(b.uid.slice(1)));

const stepAt = (build: Build, uid: string) => allSteps(build).find((step) => step.uid === uid)?.at;

const timingOf = (build: Build, uid: string) => {
  const timing = simulateReal(build).steps.find(({ stepUid }) => stepUid === uid);
  if (!timing) throw new Error(`no timing for ${uid}`);
  return timing;
};

const ceilOf = (seconds: number | null) => Math.ceil((seconds ?? Number.NaN) - 1e-9);

// First whole second after a start.
const afterStartOf = (seconds: number | null) => Math.floor((seconds ?? Number.NaN) + 1e-9) + 1;

describe('toBuild', () => {
  it('should start the first group at 0, each item after the start of the one before it, uids in the order of the build order', () => {
    const build = convert([group([item(IDAL_CONDUIT), item(BESTIARY, { count: 2 }), item(LABOURER)])]);
    const startOf = (uid: string) => timingOf(build, uid).startAt;
    const bestiariesAt = afterStartOf(startOf('s1'));

    expect(allSteps(build).map(({ uid, entityId, at }) => [uid, entityId, at])).toEqual([
      ['s1', IDAL_CONDUIT, 0],
      ['s2', BESTIARY, bestiariesAt],
      ['s3', BESTIARY, bestiariesAt],
      ['s4', LABOURER, afterStartOf(Math.max(startOf('s2') ?? 0, startOf('s3') ?? 0))],
    ]);
    expect(build.queued.map(({ entityId }) => entityId)).toEqual([LABOURER]);
    expect(build).toMatchObject({ version: 3, factionId: 'the-legion', mercenaryId: null, heroId: GALAVAX, title: 'Test', author: 'Kieirra' });
  });

  it('should start `A -> B` at the end of the last direct step of A, without its trigger', () => {
    const first = group([item(IDAL_CONDUIT), item(BESTIARY, { trigger: [group([item(BESTIARY, { count: 3 })])] })]);
    const before = convert([first]);
    const build = convert([first, group([item(IDAL_CONDUIT)])]);

    expect(stepAt(build, 's6')).toBe(ceilOf(Math.max(...['s1', 's2'].map((uid) => timingOf(before, uid).endAt ?? 0))));
    expect(stepAt(build, 's6')).toBeLessThan(ceilOf(timingOf(before, 's5').endAt));
  });

  it('should start a trigger after the start of every copy of its item, the next groups of the chain after each other', () => {
    const items = [item(IDAL_CONDUIT), item(BESTIARY, { count: 2 })];
    const chain = [group([item(LABOURER, { count: 2 })]), group([item(IDAL_CONDUIT)])];
    const before = convert([group(items)]);
    const withLabourers = convert([group([items[0], { ...items[1], trigger: chain.slice(0, 1) }])]);
    const build = convert([group([items[0], { ...items[1], trigger: chain }])]);
    const bestiaryStart = afterStartOf(Math.max(...['s2', 's3'].map((uid) => timingOf(before, uid).startAt ?? 0)));

    expect(build.queued.map(({ entityId, at }) => [entityId, at])).toEqual([
      [LABOURER, bestiaryStart],
      [LABOURER, bestiaryStart],
    ]);
    expect(stepAt(build, 's6')).toBe(ceilOf(Math.max(...['s4', 's5'].map((uid) => timingOf(withLabourers, uid).endAt ?? 0))));
  });

  it('should read `when X starts` and `when X done` on the first occurrence of X', () => {
    const groups = [
      group([item(IDAL_CONDUIT), item(BESTIARY)]),
      group([item(IDAL_CONDUIT)], { kind: 'entity', entityId: BESTIARY, event: 'starts' }),
      group([item(CITADEL)], { kind: 'entity', entityId: IDAL_CONDUIT, event: 'done' }),
    ];
    const build = convert(groups);

    expect(stepAt(build, 's3')).toBe(afterStartOf(timingOf(convert(groups.slice(0, 1)), 's2').startAt));
    expect(stepAt(build, 's4')).toBe(ceilOf(timingOf(convert(groups.slice(0, 2)), 's1').endAt));
  });

  it('should keep the awaited steps started before the steps they trigger (exalted-arandi)', () => {
    const build = convert([
      group([
        item(IDAL_CONDUIT),
        item(BESTIARY, { count: 2, trigger: [group([item(LABOURER, { count: 3 })])] }),
        item(CITADEL, { trigger: [group([item(IDAL_CONDUIT)])] }),
      ]),
    ]);
    const startOf = (uid: string) => timingOf(build, uid).startAt ?? Number.NaN;
    const bestiariesStart = Math.max(startOf('s2'), startOf('s3'));

    for (const uid of ['s5', 's6', 's7']) expect(startOf(uid)).toBeGreaterThan(bestiariesStart);
    expect(startOf('s8')).toBeGreaterThan(startOf('s4'));
  });

  it('should read the setup hero at its setup time and leave out its citation', () => {
    const build = convert([
      group([item(IDAL_CONDUIT), item(GALAVAX)]),
      group([item(BESTIARY)], { kind: 'entity', entityId: GALAVAX, event: 'starts' }),
    ]);

    expect(allSteps(build).map(({ entityId }) => entityId)).toEqual([IDAL_CONDUIT, BESTIARY]);
    expect(build.timed[1].at).toBe(15);
  });

  it('should fall back on `->` when the anchor is missing or never reached', () => {
    const build = convert([
      group([item(IDAL_CONDUIT)]),
      group([item(BESTIARY)], { kind: 'entity', entityId: ALTAR, event: 'done' }),
      group([item(CITADEL)], { kind: 'resources', hexite: 1_000_000 }),
    ]);

    expect(stepAt(build, 's2')).toBe(ceilOf(timingOf(build, 's1').endAt));
    expect(stepAt(build, 's3')).toBe(ceilOf(timingOf(build, 's2').endAt));
  });

  it('should place `when 2:30:` at its time', () => {
    const build = convert([group([item(IDAL_CONDUIT)]), group([item(BESTIARY)], { kind: 'time', seconds: 150 })]);

    expect(stepAt(build, 's2')).toBe(150);
  });

  it('should place `when 2000 hexite:` at the first second with the amount in the bank, past the default sampling', () => {
    const before = convert([group([item(IDAL_CONDUIT)])]);
    const samples = simulateBuild(before, toRealContext(before), { minSampledSeconds: HORIZON_SECONDS }).samples;
    const expected = samples.find(({ hexite }) => hexite >= 2000)?.t;

    const build = convert([group([item(IDAL_CONDUIT)]), group([item(BESTIARY)], { kind: 'resources', hexite: 2000 })]);

    expect(expected).toBeGreaterThan(60);
    expect(stepAt(build, 's2')).toBe(expected);
  });

  it('should skip a group emptied by the losses: the next `->` waits for the group before it', () => {
    const build = convert([
      group([item(IDAL_CONDUIT)]),
      group([item('the-legion/topbar/reanimate')], { kind: 'time', seconds: 600 }),
      group([item(BESTIARY)]),
    ]);

    expect(allSteps(build).map(({ entityId }) => entityId)).toEqual([IDAL_CONDUIT, BESTIARY]);
    expect(stepAt(build, 's2')).toBe(ceilOf(timingOf(build, 's1').endAt));
  });

  it('should loop the unit of `(loop X)` on each copy of its item, at the time of that item', () => {
    const build = convert([group([item(IDAL_CONDUIT), item(BESTIARY, { count: 2, loop: EXALTED }), item(CITADEL)])]);

    expect(build.queued).toEqual([
      { uid: 's4', entityId: EXALTED, producerUid: 's2', at: 1, repeat: true },
      { uid: 's5', entityId: EXALTED, producerUid: 's3', at: 1, repeat: true },
    ]);
    expect(build.timed.map(({ uid }) => uid)).toEqual(['s1', 's2', 's3', 's6']);
  });

  it('should skip a lost item, and keep the order in the groups of a trigger chain the same way', () => {
    const chain = [group([item(LABOURER), item('the-legion/topbar/reanimate'), item(LABOURER)])];
    const build = convert([group([item(GALAVAX), item('the-legion/topbar/reanimate'), item(IDAL_CONDUIT, { trigger: chain }), item(BESTIARY)])]);
    const [conduit, bestiary, first, second] = allSteps(build);

    expect(allSteps(build).map(({ entityId }) => entityId)).toEqual([IDAL_CONDUIT, BESTIARY, LABOURER, LABOURER]);
    expect([conduit.at, bestiary.at]).toEqual([0, afterStartOf(timingOf(build, conduit.uid).startAt)]);
    expect(first.at).toBe(afterStartOf(timingOf(build, conduit.uid).startAt));
    expect(second.at).toBe(afterStartOf(timingOf(build, first.uid).startAt));
  });

  // Without Flux income, the Citadel (50 Flux) never starts.
  it('should fall back one second after the item before when it never starts', () => {
    const build = convert([group([item(CITADEL), item(IDAL_CONDUIT)])]);

    expect(build.timed.map(({ at }) => at)).toEqual([0, 1]);
  });

  it('should make a `(loop X)` that is no unit once, without loop', () => {
    const build = convert([group([item(GARRISON_TOWER, { loop: LABOURER })])]);

    expect(build.queued).toEqual([{ uid: 's2', entityId: LABOURER, producerUid: 's1', at: 0 }]);
  });

  it('should never wait for a loop: neither `->` nor a trigger', () => {
    const first = group([item(BESTIARY, { trigger: [group([item(IDAL_CONDUIT)])] })]);
    const looped = group([item(BESTIARY, { loop: EXALTED, trigger: [group([item(IDAL_CONDUIT)])] })]);
    const withoutLoop = convert([first, group([item(CITADEL)])]);
    const build = convert([looped, group([item(CITADEL)])]);

    expect(stepAt(build, 's3')).toBe(stepAt(withoutLoop, 's2'));
    expect(stepAt(build, 's4')).toBe(ceilOf(timingOf(build, 's1').endAt));
  });

  it('should cut the build at MAX_STEPS steps, in the order of the build order', () => {
    const build = convert([group([item(IDAL_CONDUIT, { count: MAX_STEPS - 1 }), item(BESTIARY, { count: 5 })])]);

    expect(build.timed).toHaveLength(MAX_STEPS);
    expect(build.timed.filter(({ entityId }) => entityId === BESTIARY)).toHaveLength(1);
  });

  it('should take the default setup hero when the hero of the guide is not in the pool', () => {
    expect(convert([], 'the-xol/hero/anrubic').heroId).toBe(GALAVAX);
    expect(convert([], null).heroId).toBe(GALAVAX);
  });
});
