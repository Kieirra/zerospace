import { HEADQUARTER_IDS } from '../../guides.constants.ts';
import { findClosestName, normalizeName } from '../../guides.helpers.ts';
import type { Entity } from '../../../wiki/wiki.types.ts';
import type {
  BuildOrder,
  BuildOrderCondition,
  BuildOrderGroup,
  BuildOrderItem,
  BuildOrderName,
  BuildOrderPhase,
  BuildOrderRow,
  BuildOrderStep,
  BuildOrderTarget,
  ResolvableKind,
  ResolvedBuildOrder,
  ResolvedBuildOrderGroup,
  ResolvedBuildOrderItem,
} from '../../guides.types.ts';

const BLOCK_PATTERN = /^```bo[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;
const NOTE_DEFINITION_PATTERN = /^\^(\d+):\s*(.*)$/;
const GOAL_PATTERN = /^goal:\s*(.*)$/;
const STEP_PATTERN = /^(\d+)\.\s*(.*)$/;
const CONTINUATION_PATTERN = /^->\s*(.*)$/;
const CONDITION_PATTERN = /^when\s+(.+?)\s+(starts|done):\s*(.*)$/;
// An item, its loop and its trigger: `2 Bestiary (loop Exalted) (-> 3 Legion Labourer)`.
const SUFFIXES_PATTERN = /^((?:"[^"]*"|[^"(])*?)\s*(?:\(loop\s+([^()]*)\))?\s*(?:\((.*)\))?$/;
const ITEM_PATTERN = /^(?:([1-9]\d*)\s+)?(?:"([^"]*)"|([^"()[\]^]+?))\s*(?:\[([a-z]+)\])?\s*(?:\^(\d+))?$/;
const NAME_PATTERN = /^([^"()[\]^]+?)\s*(?:\[([a-z]+)\])?$/;
const RESOLVABLE_KINDS: ResolvableKind[] = ['unit', 'hero', 'building', 'upgrade', 'topbar'];
const GROUP_SEPARATOR = '->';
const ITEM_SEPARATOR = '+';

interface ResolutionScope {
  entities: Entity[];
  // "the-legion + arandi", for the errors.
  label: string;
}

// Text of the ```bo block, undefined for a general guide.
export const extractBuildOrder = (body: string) => {
  const blocks = [...body.matchAll(BLOCK_PATTERN)];
  if (blocks.length > 1) throw new Error('only one bo block is allowed.');
  return blocks[0]?.[1].replace(/\r?\n$/, '');
};

export const hasProse = (body: string) => body.replace(BLOCK_PATTERN, '').trim() !== '';

export const parseBuildOrder = (text: string): BuildOrder => {
  const steps: BuildOrderStep[] = [];
  const notes: BuildOrder['notes'] = [];
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const content = rawLine.trim();
    if (content === '') return;
    const noteDefinition = content.match(NOTE_DEFINITION_PATTERN);
    if (noteDefinition) {
      notes.push({ mark: Number(noteDefinition[1]), text: noteDefinition[2] });
      return;
    }
    const stepStart = content.match(STEP_PATTERN);
    if (stepStart) {
      const expected = steps.length + 1;
      if (Number(stepStart[1]) !== expected) throw lineError(line, `expected step ${expected}.`);
      steps.push({
        number: expected,
        groups: stepStart[2] === '' ? [] : parseGroups(stepStart[2], line, false),
      });
      return;
    }
    const step = steps.at(-1);
    if (!step) throw lineError(line, 'no step started.');
    const goal = content.match(GOAL_PATTERN);
    if (goal) {
      if (step.goal !== undefined) throw lineError(line, `step ${step.number} already has a goal.`);
      step.goal = goal[1];
      return;
    }
    const continuation = content.match(CONTINUATION_PATTERN);
    if (!continuation) throw lineError(line, `cannot read "${content}".`);
    step.groups.push(...parseGroups(continuation[1], line, false));
  });
  checkNotes(steps, notes);
  return { steps, notes };
};

export const resolveBuildOrder = (order: BuildOrder, scope: ResolutionScope): Omit<ResolvedBuildOrder, 'source'> => {
  let nextBase = 2;
  // First line of each entity, for the conditions.
  const firstLines = new Map<string, number>();
  const see = (entity: Entity, line: number) => {
    if (!firstLines.has(entity.id)) firstLines.set(entity.id, line);
    return entity;
  };
  const resolveTarget = (target: BuildOrderTarget, line: number) => {
    if ('text' in target) return { text: target.text };
    const entity = see(findEntity(target, scope, line), line);
    return {
      entity,
      base: HEADQUARTER_IDS.has(entity.id) ? nextBase++ : undefined,
    };
  };
  const resolveCondition = ({ name, kind, event, line }: BuildOrderCondition) => {
    const entity = findEntity({ name, kind }, scope, line);
    const firstLine = firstLines.get(entity.id);
    if (firstLine === undefined || firstLine >= line)
      throw lineError(line, `"${name}" must appear earlier in the build order.`);
    return { entity, event };
  };
  const resolveItem = ({ count, target, note, loop, trigger, line }: BuildOrderItem): ResolvedBuildOrderItem => ({
    count,
    ...resolveTarget(target, line),
    note,
    loop: loop && see(findLoopEntity(loop, scope, line), line),
    trigger: trigger?.map(resolveGroup),
  });
  const resolveGroup = ({ condition, items }: BuildOrderGroup): ResolvedBuildOrderGroup => ({
    condition: condition && resolveCondition(condition),
    items: items.map(resolveItem),
  });
  return {
    steps: order.steps.map(({ number, goal, groups }) => ({
      number,
      goal,
      groups: groups.map(resolveGroup),
    })),
    notes: order.notes,
  };
};

// Table rows numbered across the phases: one per group, then the trigger rows and the loop row of each item.
export const toBuildOrderPhases = (steps: ResolvedBuildOrder['steps']): BuildOrderPhase[] => {
  let lastNumber = 0;
  const toGroupRows = ({ condition, items }: ResolvedBuildOrderGroup, derivedWhen?: string): BuildOrderRow[] => [
    {
      number: ++lastNumber,
      items,
      when: condition ? `When ${condition.entity.name} ${condition.event}` : derivedWhen,
    },
    ...items.flatMap(toItemRows),
  ];
  const toItemRows = (item: ResolvedBuildOrderItem): BuildOrderRow[] => [
    ...(item.trigger ?? []).flatMap((group, index, groups) =>
      toGroupRows(
        group,
        index === 0 ? `When ${itemName(item)} starts` : toWaitLabel(groups[index - 1].items, group.items),
      ),
    ),
    ...(item.loop
      ? [
          {
            number: ++lastNumber,
            loop: item.loop,
            when: `When ${itemName(item)} done`,
          },
        ]
      : []),
  ];
  // Each group waits for the previous one, across the phases.
  let awaited: ResolvedBuildOrderItem[] | undefined;
  return steps.map(({ number, goal, groups }) => ({
    number,
    goal,
    rows: groups.flatMap((group) => {
      const when = awaited && toWaitLabel(awaited, group.items);
      awaited = group.items;
      return toGroupRows(group, when);
    }),
  }));
};

// "When Armory and Arandi Penumbra done": items of the awaited group that produce or unlock an item of the group.
const toWaitLabel = (awaited: ResolvedBuildOrderItem[], items: ResolvedBuildOrderItem[]) => {
  const needed = new Set(items.flatMap(({ entity }) => [...(entity?.producedBy ?? []), ...(entity?.requires ?? [])]));
  const names = new Set(awaited.flatMap(({ entity }) => (entity && needed.has(entity.id) ? [entity.name] : [])));
  return names.size === 0 ? undefined : `When ${joinNames([...names])} done`;
};

const itemName = (item: ResolvedBuildOrderItem) => item.entity?.name ?? item.text ?? '';

// "A", "A and B", "A, B and C".
const joinNames = (names: string[]) =>
  names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

const parseGroups = (text: string, line: number, isTrigger: boolean) =>
  splitTopLevel(text, GROUP_SEPARATOR).map((group) => parseGroup(group, line, isTrigger));

const parseGroup = (text: string, line: number, isTrigger: boolean): BuildOrderGroup => {
  const [, name, event, items = text] = text.match(CONDITION_PATTERN) ?? [];
  return {
    condition: name === undefined ? undefined : parseCondition(name, event, text, line),
    items: splitTopLevel(items, ITEM_SEPARATOR).map((item) => parseItem(item, line, isTrigger)),
  };
};

const parseCondition = (name: string, event: string, text: string, line: number): BuildOrderCondition => ({
  ...parseName(name, text, line),
  event: event === 'starts' ? 'starts' : 'done',
  line,
});

const parseItem = (text: string, line: number, isTrigger: boolean): BuildOrderItem => {
  const [, head, loop, trigger] = text.match(SUFFIXES_PATTERN) ?? [];
  const item = head?.match(ITEM_PATTERN);
  const [, count, freeText, name, kind, note] = item ?? [];
  if (!item || (kind !== undefined && !isResolvableKind(kind))) throw lineError(line, `cannot read "${text}".`);
  const target: BuildOrderTarget = freeText === undefined ? { name, kind } : { text: freeText };
  return {
    count: count === undefined ? 1 : Number(count),
    target,
    note: note === undefined ? undefined : Number(note),
    loop: loop === undefined ? undefined : parseName(loop, text, line),
    trigger: trigger === undefined ? undefined : parseTrigger(trigger, line, isTrigger),
    line,
  };
};

const parseName = (value: string, text: string, line: number): BuildOrderName => {
  const [, name, kind] = value.trim().match(NAME_PATTERN) ?? [];
  if (name === undefined || (kind !== undefined && !isResolvableKind(kind)))
    throw lineError(line, `cannot read "${text}".`);
  return { name, kind };
};

const parseTrigger = (text: string, line: number, isTrigger: boolean) => {
  const trigger = text.trim().match(CONTINUATION_PATTERN);
  if (!trigger) throw lineError(line, '"(" must start with "->".');
  if (isTrigger) throw lineError(line, 'nested "(->" is not supported.');
  return parseGroups(trigger[1], line, true);
};

// Splits on the separators outside parentheses and quotes.
const splitTopLevel = (text: string, separator: string) => {
  const parts: string[] = [];
  let depth = 0;
  let isQuoted = false;
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') isQuoted = !isQuoted;
    if (isQuoted) continue;
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth === 0 && text.startsWith(separator, index)) {
      parts.push(text.slice(start, index));
      start = index + separator.length;
      index = start - 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim());
};

const checkNotes = (steps: BuildOrderStep[], notes: BuildOrder['notes']) => {
  const used = new Set(steps.flatMap(({ groups }) => groups.flatMap(collectNoteMarks)));
  const defined = new Set(notes.map(({ mark }) => mark));
  for (const mark of used) if (!defined.has(mark)) throw new Error(`bo: note ^${mark} is not defined.`);
  for (const mark of defined) if (!used.has(mark)) throw new Error(`bo: note ^${mark} is never used.`);
};

const collectNoteMarks = ({ items }: BuildOrderGroup): number[] =>
  items.flatMap(({ note, trigger = [] }) => [
    ...(note === undefined ? [] : [note]),
    ...trigger.flatMap(collectNoteMarks),
  ]);

const findEntity = ({ name, kind }: BuildOrderName, scope: ResolutionScope, line: number) => {
  const normalized = normalizeName(name);
  const matches = scope.entities.filter(
    (entity) => normalizeName(entity.name) === normalized && (kind === undefined || entity.kind === kind),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const kinds = matches.map((entity) => entity.kind);
    throw lineError(line, `"${name}" is ambiguous (${kinds.join(', ')}). Add [${kinds[0]}].`);
  }
  const suggestion = findClosestName(name, [...new Set(scope.entities.map((entity) => entity.name))]);
  throw lineError(line, `"${name}" not found in ${scope.label}.${suggestion ? ` Did you mean "${suggestion}"?` : ''}`);
};

const findLoopEntity = (loop: BuildOrderName, scope: ResolutionScope, line: number) => {
  const entity = findEntity(loop, scope, line);
  if (entity.kind !== 'unit' && entity.kind !== 'hero')
    throw lineError(line, `"${loop.name}" cannot be looped (not a unit or hero).`);
  return entity;
};

const isResolvableKind = (kind: string): kind is ResolvableKind =>
  RESOLVABLE_KINDS.some((candidate) => candidate === kind);

const lineError = (line: number, message: string) => new Error(`bo line ${line}: ${message}`);
