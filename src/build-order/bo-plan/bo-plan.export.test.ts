import { describe, expect, it } from 'vitest';
import { getCatalog, simulateReal } from '../engine/engine.wiki-fixtures.ts';
import { toBoPlan } from './bo-plan.export.ts';
import { toBuild } from './bo-plan.import.ts';
import { toBoName } from './bo-plan.names.ts';
import { printBoPlan } from './bo-plan.print.ts';
import type { Build } from '../build-order.types.ts';
import type { BoAnchor, BoGroup, BoItem, BoPlan } from './bo-plan.types.ts';

const CATALOGS = { faction: getCatalog('the-legion'), mercenary: getCatalog('arandi') };
const IDAL_CONDUIT = 'the-legion/building/idal-conduit';
const BESTIARY = 'the-legion/building/bestiary';
const CITADEL = 'the-legion/building/citadel';
const ALTAR = 'the-legion/building/altar';
const LABOURER = 'the-legion/unit/legion-labourer';
const EXALTED = 'the-legion/unit/exalted';
const AFTER_PREVIOUS: BoAnchor = { kind: 'after-previous' };

const item = (entityId: string, extra: Partial<BoItem> = {}): BoItem => ({ entityId, count: 1, ...extra });
const group = (items: BoItem[], anchor: BoAnchor = AFTER_PREVIOUS): BoGroup => ({ anchor, items });
const plan = (groups: BoGroup[]): BoPlan => ({
  factionId: 'the-legion',
  mercenaryId: 'arandi',
  heroId: 'the-legion/hero/galavax',
  title: 'Test',
  author: 'Kieirra',
  phases: [{ number: 1, groups }],
});

const exportOf = (build: Build) => toBoPlan(build, simulateReal(build), CATALOGS);

describe('toBoPlan', () => {
  it('should give back `+`, a trigger, a loop and `->` from the build they make', () => {
    const groups = [
      group([
        item(IDAL_CONDUIT),
        item(BESTIARY, { count: 2, loop: EXALTED, trigger: [group([item(LABOURER, { count: 3 })])] }),
        item(CITADEL),
      ]),
      group([item(ALTAR)]),
    ];

    expect(exportOf(toBuild(plan(groups), CATALOGS)).phases).toEqual([{ number: 1, groups }]);
  });

  // In time order: a second Bestiary at 0:05, then the Citadel once the Idal Conduit is done (0:12).
  it('should write `when m:ss:` and `when X done:` from the times', () => {
    const groups = [
      group([item(IDAL_CONDUIT), item(BESTIARY)]),
      group([item(BESTIARY)], { kind: 'time', seconds: 5 }),
      group([item(CITADEL)], { kind: 'entity', entityId: IDAL_CONDUIT, event: 'done' }),
    ];

    expect(exportOf(toBuild(plan(groups), CATALOGS)).phases[0].groups.map(({ anchor }) => anchor)).toEqual(groups.map(({ anchor }) => anchor));
  });

  it('should write a unit without time at the second of its click, and never a copy of a loop', () => {
    const build: Build = {
      ...toBuild(plan([group([item(IDAL_CONDUIT), item(BESTIARY, { loop: EXALTED })])]), CATALOGS),
      queued: [],
    };
    const looped = { ...build, queued: [{ uid: 's9', entityId: EXALTED, producerUid: 's2', repeat: true as const }, { uid: 's10', entityId: LABOURER }] };
    const items = exportOf(looped).phases.flatMap(({ groups }) => groups.flatMap(({ items }) => items));

    expect(items.map(({ entityId, count, loop }) => [entityId, count, loop])).toEqual([
      [IDAL_CONDUIT, 1, undefined],
      [LABOURER, 1, undefined],
      [BESTIARY, 1, EXALTED],
    ]);
  });

  it('should open a new phase at each group holding a base', () => {
    const build = toBuild(plan([group([item(IDAL_CONDUIT)]), group([item('the-legion/building/garrison-tower')])]), CATALOGS);

    expect(exportOf(build).phases.map(({ number, groups }) => [number, groups.length])).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });
});

describe('toBoName', () => {
  const named = (id: string) => {
    const entity = [...CATALOGS.faction.entities, ...CATALOGS.mercenary.entities].find((candidate) => candidate.id === id);
    if (!entity) throw new Error(`no ${id}`);
    return toBoName(entity, CATALOGS);
  };

  it('should write the wiki name, a kind when the name is shared, never the display name', () => {
    expect(named('the-legion/hero/kraegar')).toBe('Kraegar');
    expect(named('the-legion/building/dreadnought')).toBe('Dreadnought [building]');
    expect(named(BESTIARY)).toBe('Bestiary');
  });

  it('should give up on a name the kind does not tell apart', () => {
    expect(named('the-legion/upgrade/performance-enhancers')).toBeNull();
    expect(named('the-legion/upgrade/performance-enhancers-steelsworn')).toBeNull();
  });
});

describe('printBoPlan', () => {
  it('should print the fenced block, one line per group, the unreadable names as quoted text', () => {
    const printed = printBoPlan(
      {
        ...plan([group([item(IDAL_CONDUIT), item(BESTIARY, { count: 2, loop: EXALTED, trigger: [group([item(LABOURER, { count: 3 })])] })])]),
        phases: [
          { number: 1, groups: [group([item(IDAL_CONDUIT), item(BESTIARY, { count: 2, loop: EXALTED, trigger: [group([item(LABOURER, { count: 3 })])] })])] },
          { number: 2, groups: [group([item('the-legion/upgrade/performance-enhancers-steelsworn')], { kind: 'time', seconds: 150 })] },
        ],
      },
      CATALOGS,
    );

    expect(printed).toBe(
      [
        '```bo',
        '1. Idal Conduit + 2 Bestiary (loop Exalted) (-> 3 Legion Labourer)',
        '2. when 2:30: "Performance Enhancers (Steelsworn)"',
        '```',
      ].join('\n'),
    );
  });
});
