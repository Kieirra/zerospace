import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Entity } from '../../../wiki/wiki.types.ts';
import type { BuildOrderItem } from '../../guides.types.ts';
import {
  extractBuildOrders,
  parseBuildOrder,
  resolveBuildOrder,
  resolveBuildOrders,
  toBuildOrderPhases,
} from './build-order.helpers.ts';

const entity = (
  name: string,
  kind: Entity['kind'],
  faction = 'the-legion',
  relations: Pick<Entity, 'producedBy' | 'requires'> = {},
): Entity => ({
  id: `${faction}/${kind}/${name.toLowerCase().replaceAll(' ', '-')}`,
  kind,
  faction,
  name,
  ...relations,
});

const SCOPE = {
  label: 'the-legion + arandi',
  entities: [
    entity('Bestiary', 'building'),
    entity('Idal Conduit', 'building'),
    entity('Garrison Tower', 'building'),
    entity('Legion Labourer', 'unit'),
    entity('Exalted', 'unit'),
    entity('Dreadnought', 'unit'),
    entity('Dreadnought', 'upgrade'),
    entity('Arandi Penumbra', 'building', 'arandi'),
    entity('Citadel', 'building'),
    entity('Altar', 'building', 'the-legion', {
      requires: ['the-legion/building/citadel'],
    }),
    entity('Armory', 'building'),
    entity('Terror Tower', 'building'),
    entity('Kraegar', 'hero', 'the-legion', {
      producedBy: ['the-legion/building/altar'],
    }),
    entity('More Feed', 'upgrade', 'the-legion', {
      requires: ['the-legion/building/armory'],
    }),
    entity('Explosive Warhead', 'upgrade', 'the-legion', {
      requires: ['the-legion/building/armory', 'the-legion/building/terror-tower'],
    }),
    entity('Arandi Judgement', 'unit', 'arandi', {
      producedBy: ['arandi/building/arandi-penumbra'],
    }),
  ],
};

const item = (name: string, count = 1, line = 1): BuildOrderItem => ({
  count,
  target: { name },
  line,
});

const firstGroups = (text: string) => parseBuildOrder(text).steps[0].groups.map(({ items }) => items);

describe('Build order parsing', () => {
  it('should read one group with a quantity when a step lists items joined by +', () => {
    expect(firstGroups('1. Idal Conduit + 2 Bestiary')).toEqual([[item('Idal Conduit'), item('Bestiary', 2)]]);
  });

  it('should start a new group when the line contains ->', () => {
    expect(firstGroups('1. Idal Conduit -> Bestiary')).toEqual([[item('Idal Conduit')], [item('Bestiary')]]);
  });

  it('should continue the current step when a line starts with ->', () => {
    expect(firstGroups('1. Idal Conduit\n   -> Bestiary')).toEqual([[item('Idal Conduit')], [item('Bestiary', 1, 2)]]);
  });

  it('should attach the trigger to its item when an item is followed by (->', () => {
    const [[conduit, bestiary, citadel]] = firstGroups('1. Idal Conduit + 2 Bestiary (-> 3 Legion Labourer) + Citadel');

    expect(conduit.trigger).toBeUndefined();
    expect(bestiary.trigger).toEqual([{ items: [item('Legion Labourer', 3)] }]);
    expect(citadel).toEqual(item('Citadel'));
  });

  it('should attach the loop to its item when the name is followed by (loop and a trigger', () => {
    const [[bestiary]] = firstGroups('1. 2 Bestiary (loop Exalted) (-> 3 Legion Labourer)');

    expect(bestiary.loop).toEqual({ name: 'Exalted', kind: undefined });
    expect(bestiary.trigger).toEqual([{ items: [item('Legion Labourer', 3)] }]);
  });

  it('should set the step goal when a goal: line follows the step', () => {
    expect(parseBuildOrder('1. Bestiary\ngoal: first power spike').steps[0].goal).toBe('first power spike');
  });

  it('should link the note when an item has ^1 and the block defines ^1:', () => {
    const order = parseBuildOrder('1. Hallowed Strike^1\n^1: +4 range');

    expect(order.steps[0].groups[0].items[0].note).toBe(1);
    expect(order.notes).toEqual([{ mark: 1, text: '+4 range' }]);
  });

  it('should keep free text when an item is quoted', () => {
    expect(firstGroups('1. "scout" + Bestiary')[0][0].target).toEqual({
      text: 'scout',
    });
  });

  it('should keep the kind when the name is followed by [building]', () => {
    expect(firstGroups('1. Dreadnought [building]')[0][0].target).toEqual({
      name: 'Dreadnought',
      kind: 'building',
    });
  });

  it('should read the condition when a step starts with when <name> starts:', () => {
    const [group] = parseBuildOrder('1. when Kraegar starts: Garrison Tower + Armory').steps[0].groups;

    expect(group).toEqual({
      condition: { name: 'Kraegar', kind: undefined, event: 'starts', line: 1 },
      items: [item('Garrison Tower'), item('Armory')],
    });
  });

  it('should read the condition when a group after -> starts with when <name> done:', () => {
    const [first, second] = parseBuildOrder('1. Armory\n   -> when Armory done: More Feed').steps[0].groups;

    expect(first.condition).toBeUndefined();
    expect(second).toEqual({
      condition: { name: 'Armory', kind: undefined, event: 'done', line: 2 },
      items: [item('More Feed', 1, 2)],
    });
  });

  it('should keep the kind of the condition when the name is followed by [unit]', () => {
    const [, phase] = parseBuildOrder('1. Bestiary\n2. when Dreadnought [unit] done: Altar').steps;

    expect(phase.groups[0].condition).toEqual({ name: 'Dreadnought', kind: 'unit', event: 'done', line: 2 });
  });

  it('should fail when a trigger is nested', () => {
    expect(() => parseBuildOrder('1. Bestiary (-> Altar (-> Citadel))')).toThrow(
      'bo line 1: nested "(->" is not supported.',
    );
  });

  it('should fail when a parenthesis does not start with ->', () => {
    expect(() => parseBuildOrder('1. Bestiary (Altar)')).toThrow('bo line 1: "(" must start with "->".');
  });

  it('should fail when a continuation comes before any step', () => {
    expect(() => parseBuildOrder('-> Bestiary')).toThrow('bo line 1: no step started.');
  });

  it('should fail when the steps are not consecutive', () => {
    expect(() => parseBuildOrder('1. Bestiary\n3. Altar')).toThrow('bo line 2: expected step 2.');
  });

  it('should fail when a step has two goals', () => {
    expect(() => parseBuildOrder('1. Bestiary\ngoal: a\ngoal: b')).toThrow('bo line 3: step 1 already has a goal.');
  });

  it('should fail when a note is referenced but not defined', () => {
    expect(() => parseBuildOrder('1. Bestiary^1')).toThrow('bo: note ^1 is not defined.');
  });

  it('should fail when a note is defined but never used', () => {
    expect(() => parseBuildOrder('1. Bestiary\n^2: unused')).toThrow('bo: note ^2 is never used.');
  });

  it('should extract the first block as the main build order when it starts the body', () => {
    const body = '\n```bo\n1. Bestiary\n```\n\n## If they go Skrells\n\n```bo\n1. Altar\n```\n\n```bo\n1. Citadel\n```\n';

    expect(extractBuildOrders(body)).toEqual({ main: '1. Bestiary', branches: ['1. Altar', '1. Citadel'] });
  });

  it('should extract every block as a branch when text comes before the first block', () => {
    const body = '## Scouting\n\n```bo\n1. Altar\n```\n\n```bo\n1. Citadel\n```\n';

    expect(extractBuildOrders(body)).toEqual({ branches: ['1. Altar', '1. Citadel'] });
  });

  it('should extract no block when the guide has no bo block', () => {
    expect(extractBuildOrders('## Economy\n\nSome text.')).toEqual({ branches: [] });
  });
});

describe('Build order name resolution', () => {
  const resolveSteps = (text: string) => resolveBuildOrder(parseBuildOrder(text), SCOPE).steps;
  const resolveFirst = (text: string) => resolveSteps(text)[0].groups.map(({ items }) => items);

  it('should find the entity when the name differs only by case', () => {
    expect(resolveFirst('1. idal CONDUIT')[0][0].entity?.id).toBe('the-legion/building/idal-conduit');
  });

  it('should suggest the closest name when the name is not in scope', () => {
    expect(() => resolveFirst('1. 2 Bestairy')).toThrow(
      'bo line 1: "Bestairy" not found in the-legion + arandi. Did you mean "Bestiary"?',
    );
  });

  it('should fail when the name exists twice in scope', () => {
    expect(() => resolveFirst('1. Dreadnought')).toThrow(
      'bo line 1: "Dreadnought" is ambiguous (unit, upgrade). Add [unit].',
    );
  });

  it('should pick the entity of the kind when the name has [kind]', () => {
    expect(resolveFirst('1. Dreadnought [upgrade]')[0][0].entity?.id).toBe('the-legion/upgrade/dreadnought');
  });

  it('should resolve the looped unit when an item has (loop', () => {
    expect(resolveFirst('1. Bestiary (loop exalted)')[0][0].loop?.id).toBe('the-legion/unit/exalted');
  });

  it('should fail when the looped name is not a unit or hero', () => {
    expect(() => resolveFirst('1. Bestiary (loop Idal Conduit)')).toThrow(
      'bo line 1: "Idal Conduit" cannot be looped (not a unit or hero).',
    );
  });

  it('should number the bases from 2 when headquarters appear, triggers included', () => {
    const groups = resolveFirst('1. Garrison Tower + Bestiary (-> Garrison Tower)\n-> Garrison Tower');
    const [[firstBase, bestiary], [thirdBase]] = groups;

    expect(firstBase.base).toBe(2);
    expect(bestiary.trigger?.[0].items[0].base).toBe(3);
    expect(thirdBase.base).toBe(4);
  });

  it('should resolve the condition entity when the name differs only by case', () => {
    expect(resolveSteps('1. Altar\n2. when altar done: Kraegar')[1].groups[0].condition).toEqual({
      entity: expect.objectContaining({ id: 'the-legion/building/altar' }),
      event: 'done',
    });
  });

  it('should pick the entity of the kind when the condition name has [kind]', () => {
    const [, phase] = resolveSteps('1. Dreadnought [unit]\n2. when Dreadnought [unit] done: Altar');

    expect(phase.groups[0].condition?.entity.id).toBe('the-legion/unit/dreadnought');
  });

  it('should accept the condition when the name only appears in a loop of an earlier line', () => {
    const [, phase] = resolveSteps('1. Bestiary (loop Exalted)\n2. when Exalted starts: Altar');

    expect(phase.groups[0].condition?.entity.id).toBe('the-legion/unit/exalted');
  });

  it('should fail when the condition name does not appear in an earlier line', () => {
    expect(() => resolveSteps('1. when Kraegar starts: Altar\n2. Kraegar')).toThrow(
      'bo line 1: "Kraegar" must appear earlier in the build order.',
    );
    expect(() => resolveSteps('1. Altar -> when Altar done: Kraegar')).toThrow(
      'bo line 1: "Altar" must appear earlier in the build order.',
    );
  });

  it('should fail when the condition name is not in scope', () => {
    expect(() => resolveSteps('1. Altar\n2. when Altr done: Kraegar')).toThrow(
      'bo line 2: "Altr" not found in the-legion + arandi. Did you mean "Altar"?',
    );
  });

  it('should keep free text unresolved when an item is quoted', () => {
    expect(resolveFirst('1. "scout"')[0][0]).toEqual({
      count: 1,
      text: 'scout',
      note: undefined,
      trigger: undefined,
    });
  });
});

describe('Build order branches', () => {
  const firstItems = ({ steps }: ReturnType<typeof resolveBuildOrder>) => steps[0].groups[0].items;

  it('should continue the base count of the main build order when a branch takes a base', () => {
    const {
      main,
      branches: [firstBranch, secondBranch],
    } = resolveBuildOrders(
      { main: '1. Garrison Tower\n2. Garrison Tower', branches: ['1. Garrison Tower', '1. Bestiary + Garrison Tower'] },
      SCOPE,
    );

    expect(main?.steps.map(({ groups }) => groups[0].items[0].base)).toEqual([2, 3]);
    expect(firstItems(firstBranch)[0].base).toBe(4);
    expect(firstItems(secondBranch)[1].base).toBe(4);
  });

  it('should accept the condition when a branch waits for an entity of the main build order', () => {
    const {
      branches: [branch],
    } = resolveBuildOrders({ main: '1. Altar\n2. Kraegar', branches: ['1. when Kraegar starts: Armory'] }, SCOPE);

    expect(branch.steps[0].groups[0].condition?.entity.id).toBe('the-legion/hero/kraegar');
  });

  it('should fail when a branch waits for an entity of another branch', () => {
    expect(() =>
      resolveBuildOrders({ main: '1. Altar', branches: ['1. Armory', '1. when Armory done: More Feed'] }, SCOPE),
    ).toThrow(
      'bo block 3, line 1: "Armory" must appear earlier in the build order.',
    );
  });

  it('should keep the notes of each block when the blocks define the same mark', () => {
    const {
      main,
      branches: [branch],
    } = resolveBuildOrders({ main: '1. Altar^1\n^1: main note', branches: ['1. Armory^1\n^1: branch note'] }, SCOPE);

    expect(main?.notes).toEqual([{ mark: 1, text: 'main note' }]);
    expect(branch.notes).toEqual([{ mark: 1, text: 'branch note' }]);
  });

  it('should fail when a branch uses a note defined only in the main build order', () => {
    expect(() => resolveBuildOrders({ main: '1. Altar^1\n^1: main note', branches: ['1. Armory^1'] }, SCOPE)).toThrow(
      'bo block 2: note ^1 is not defined.',
    );
  });

  it('should prefix the error with the block and its own line when a branch is invalid', () => {
    expect(() => resolveBuildOrders({ main: '1. Altar', branches: ['1. Armory\n   -> Bestairy'] }, SCOPE)).toThrow(
      'bo block 2, line 2: "Bestairy" not found in the-legion + arandi. Did you mean "Bestiary"?',
    );
    expect(() => resolveBuildOrders({ main: '1. Altar', branches: ['1. Armory\n3. Altar'] }, SCOPE)).toThrow(
      'bo block 2, line 2: expected step 2.',
    );
  });

  it('should keep the error unprefixed when the main build order is invalid', () => {
    expect(() => resolveBuildOrders({ main: '1. Altar\n-> Bestairy', branches: ['1. Armory'] }, SCOPE)).toThrow(
      'bo line 2: "Bestairy" not found in the-legion + arandi. Did you mean "Bestiary"?',
    );
  });

  it('should keep the source of the main build order for Copy', () => {
    expect(resolveBuildOrders({ main: '1. Altar', branches: [] }, SCOPE).main?.source).toBe('1. Altar');
  });

  it('should start the base count from B2 when there is no main build order', () => {
    const { main, branches } = resolveBuildOrders(
      { branches: ['1. Garrison Tower\n2. Garrison Tower', '1. Garrison Tower'] },
      SCOPE,
    );

    expect(main).toBeUndefined();
    expect(branches[0].steps.map(({ groups }) => groups[0].items[0].base)).toEqual([2, 3]);
    expect(firstItems(branches[1])[0].base).toBe(2);
  });

  it('should number the first block 1 in the errors when there is no main build order', () => {
    expect(() => resolveBuildOrders({ branches: ['1. Armory\n   -> Bestairy'] }, SCOPE)).toThrow(
      'bo block 1, line 2: "Bestairy" not found in the-legion + arandi. Did you mean "Bestiary"?',
    );
    expect(() => resolveBuildOrders({ branches: ['1. Altar', '1. Armory\n3. Altar'] }, SCOPE)).toThrow(
      'bo block 2, line 2: expected step 2.',
    );
  });

  it('should fail when a branch waits for an entity outside its block and there is no main build order', () => {
    expect(() => resolveBuildOrders({ branches: ['1. Altar', '1. when Altar done: Armory'] }, SCOPE)).toThrow(
      'bo block 2, line 1: "Altar" must appear earlier in the build order.',
    );
  });
});

describe('Build order table', () => {
  const toPhases = (text: string) => toBuildOrderPhases(resolveBuildOrder(parseBuildOrder(text), SCOPE).steps);
  const toRows = (text: string) => toPhases(text).flatMap(({ rows }) => rows);
  const whenOf = (text: string) => toRows(text).map(({ when }) => when);

  it('should number the rows across phases and name the trigger on its first row only when groups and triggers follow each other', () => {
    const phases = toPhases(
      '1. Idal Conduit + 2 Bestiary (-> Legion Labourer -> Exalted)\n-> Idal Conduit\n2. Garrison Tower',
    );

    expect(phases.map(({ rows }) => rows.map(({ number, when }) => ({ number, when })))).toEqual([
      [
        { number: 1, when: undefined },
        { number: 2, when: 'When Bestiary starts' },
        { number: 3, when: undefined },
        { number: 4, when: undefined },
      ],
      [{ number: 5, when: undefined }],
    ]);
  });

  it('should leave the first row empty when the build order starts', () => {
    expect(whenOf('1. Citadel')).toEqual([undefined]);
  });

  it('should wait for the producer when an entity of the row is produced by the previous group', () => {
    expect(whenOf('1. Altar\n-> Kraegar')).toEqual([undefined, 'When Altar done']);
  });

  it('should wait for the requirement when an entity of the row requires the previous group', () => {
    expect(whenOf('1. Idal Conduit + Citadel\n-> Altar')).toEqual([undefined, 'When Citadel done']);
  });

  it('should list each awaited entity once in order of appearance when several entities match', () => {
    expect(whenOf('1. Armory + Arandi Penumbra\n-> More Feed + Arandi Judgement + More Feed')).toEqual([
      undefined,
      'When Armory and Arandi Penumbra done',
    ]);
    expect(whenOf('1. Terror Tower + Armory + Arandi Penumbra\n-> Explosive Warhead + Arandi Judgement')).toEqual([
      undefined,
      'When Terror Tower, Armory and Arandi Penumbra done',
    ]);
    expect(whenOf('1. Terror Tower + Armory + Arandi Penumbra\n-> More Feed + Explosive Warhead')).toEqual([
      undefined,
      'When Terror Tower and Armory done',
    ]);
  });

  it('should replace the derived condition when the group has an explicit condition', () => {
    const text = '1. Altar\n-> Kraegar\n2. when Kraegar starts: Terror Tower + Armory\n-> when Altar done: More Feed';

    expect(whenOf(text)).toEqual([undefined, 'When Altar done', 'When Kraegar starts', 'When Altar done']);
  });

  it('should leave the row empty when no entity of the row depends on the previous group', () => {
    expect(whenOf('1. Kraegar + Bestiary\n-> Altar')).toEqual([undefined, undefined]);
  });

  it('should wait for the last group of the previous phase when a phase starts', () => {
    expect(whenOf('1. Citadel\n2. Altar')).toEqual([undefined, 'When Citadel done']);
  });

  it('should add the loop row after the trigger rows when an item has a loop and a trigger', () => {
    const rows = toRows('1. 2 Bestiary (loop Exalted) (-> 3 Legion Labourer)\n-> Citadel');
    const summary = rows.map(({ number, when, ...row }) => ({
      number,
      when,
      loop: 'loop' in row ? row.loop.id : undefined,
    }));

    expect(summary).toEqual([
      { number: 1, when: undefined, loop: undefined },
      {
        number: 2,
        when: 'When Bestiary starts',
        loop: undefined,
      },
      {
        number: 3,
        when: 'When Bestiary done',
        loop: 'the-legion/unit/exalted',
      },
      { number: 4, when: undefined, loop: undefined },
    ]);
  });
});

describe('Exalted Arandi guide', () => {
  it('should parse into 4 steps with their groups and goals', () => {
    const body = readFileSync(new URL('../../../../data/guides/exalted-arandi.md', import.meta.url), 'utf8');
    const [, , guideBody] = body.split(/^---$/m);
    const { main = '' } = extractBuildOrders(guideBody);
    const { steps } = parseBuildOrder(main);

    expect(steps.map(({ groups }) => groups.length)).toEqual([3, 2, 2, 1]);
    expect(steps[0].groups[0].items[1].loop).toEqual({
      name: 'Exalted',
      kind: undefined,
    });
    expect(steps[1].groups[0].condition).toEqual({
      name: 'Kraegar',
      kind: undefined,
      event: 'starts',
      line: 5,
    });
    expect(steps[3].groups[0].items[0].target).toEqual({
      name: 'Dreadnought',
      kind: 'unit',
    });
    expect(steps.map(({ goal }) => goal)).toEqual([
      'Take map control and the 3 XP towers',
      'Kraegar out, take B2 and fast tech',
      'Late game, every hero upgrade, close the game',
      'Dreadnought finisher',
    ]);
  });
});
