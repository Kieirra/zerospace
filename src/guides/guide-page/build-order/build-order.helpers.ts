import { HEADQUARTER_IDS } from '../../guides.constants.ts';
import { findClosestName, normalizeName } from '../../guides.helpers.ts';
import { findBuildOrderBlocks } from '../../strip-build-order.ts';
import { RESOURCES } from '../../../wiki/wiki.helpers.ts';
import type { CostSegment, Entity } from '../../../wiki/wiki.types.ts';
import type {
  BuildOrder,
  BuildOrderCondition,
  BuildOrderGroup,
  BuildOrderItem,
  BuildOrderName,
  BuildOrderPhase,
  BuildOrderRow,
  BuildOrderSources,
  BuildOrderStep,
  BuildOrderTarget,
  BuildOrderWhen,
  ResolvableKind,
  ResolvedBuildOrder,
  ResolvedBuildOrderCondition,
  ResolvedBuildOrderGroup,
  ResolvedBuildOrderItem,
} from '../../guides.types.ts';

const NOTE_DEFINITION_PATTERN = /^\^(\d+):\s*(.*)$/;
const GOAL_PATTERN = /^goal:\s*(.*)$/;
const STEP_PATTERN = /^(\d+)\.\s*(.*)$/;
const CONTINUATION_PATTERN = /^->\s*(.*)$/;
// The condition ends at the first colon not followed by a digit: `when 2:30: Altar`.
const CONDITION_PATTERN = /^when\s+(.+?):(?!\d)\s*(.*)$/;
const ENTITY_CONDITION_PATTERN = /^(.+?)\s+(starts|done)$/;
const RESOURCES_CONDITION_PATTERN = /^\d+\s+[a-z]+(?:\s+and\s+\d+\s+[a-z]+)*$/i;
const TIMER_CONDITION_PATTERN = /^\d+:(\d{2})$/;
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

// Advanced by the resolution: the end of the main build order is the start of each branch.
interface ResolutionState {
  nextBase: number;
  // First line of each entity, for the conditions. 0 = in the main build order.
  firstLines: Map<string, number>;
}

// Text of each ```bo block. Without a main build order, every block is a branch.
export const extractBuildOrders = (body: string): BuildOrderSources => {
  const { blocks, hasMain } = findBuildOrderBlocks(body);
  const sources = blocks.map(({ source }) => source);
  return hasMain ? { main: sources[0], branches: sources.slice(1) } : { branches: sources };
};

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
      // The first step can carry any number, the next ones follow it.
      const number = Number(stepStart[1]);
      const previous = steps.at(-1);
      const expected = previous ? previous.number + 1 : Math.max(number, 1);
      if (number !== expected) throw lineError(line, `expected step ${expected}.`);
      steps.push({
        number,
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

// Each branch starts where the main build order ends, or from B2 without a main build order.
export const resolveBuildOrders = ({ main, branches }: BuildOrderSources, scope: ResolutionScope) => {
  const mainState: ResolutionState = { nextBase: 2, firstLines: new Map() };
  const mainOrder =
    main === undefined ? undefined : { ...resolveBuildOrder(parseBuildOrder(main), scope, mainState), source: main };
  const firstBranchBlock = main === undefined ? 1 : 2;
  return {
    main: mainOrder,
    branches: branches.map((source, index) =>
      inBranch(index + firstBranchBlock, () =>
        resolveBuildOrder(parseBuildOrder(source), scope, {
          nextBase: mainState.nextBase,
          firstLines: new Map([...mainState.firstLines.keys()].map((id) => [id, 0])),
        }),
      ),
    ),
  };
};

export const resolveBuildOrder = (
  order: BuildOrder,
  scope: ResolutionScope,
  state: ResolutionState = { nextBase: 2, firstLines: new Map() },
): Omit<ResolvedBuildOrder, 'source'> => {
  const { firstLines } = state;
  const see = (entity: Entity, line: number) => {
    if (!firstLines.has(entity.id)) firstLines.set(entity.id, line);
    return entity;
  };
  const resolveTarget = (target: BuildOrderTarget, line: number) => {
    if ('text' in target) return { text: target.text };
    const entity = see(findEntity(target, scope, line), line);
    return {
      entity,
      base: HEADQUARTER_IDS.has(entity.id) ? state.nextBase++ : undefined,
    };
  };
  const resolveCondition = (condition: BuildOrderCondition): ResolvedBuildOrderCondition => {
    if (condition.type !== 'entity') return condition;
    const { name, kind, event, line } = condition;
    const entity = findEntity({ name, kind }, scope, line);
    const firstLine = firstLines.get(entity.id);
    if (firstLine === undefined || firstLine >= line)
      throw lineError(line, `"${name}" must appear earlier in the build order.`);
    return { type: 'entity', entity, event };
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
      when: condition ? toConditionWhen(condition) : derivedWhen,
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

const toConditionWhen = (condition: ResolvedBuildOrderCondition): BuildOrderWhen => {
  if (condition.type === 'entity') return `When ${condition.entity.name} ${condition.event}`;
  if (condition.type === 'timer') return { ...condition, label: `At ${condition.time}` };
  if (condition.type === 'resources')
    return {
      ...condition,
      label: `When ${condition.resources.map(({ amount, resource }) => `${amount} ${resource}`).join(' and ')}`,
    };
  return condition;
};

const itemName = (item: ResolvedBuildOrderItem) => item.entity?.name ?? item.text ?? '';

// "A", "A and B", "A, B and C".
const joinNames = (names: string[]) =>
  names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

const parseGroups = (text: string, line: number, isTrigger: boolean) =>
  splitTopLevel(text, GROUP_SEPARATOR).map((group) => parseGroup(group, line, isTrigger));

const parseGroup = (text: string, line: number, isTrigger: boolean): BuildOrderGroup => {
  const [, condition, items = text] = text.match(CONDITION_PATTERN) ?? [];
  return {
    condition: condition === undefined ? undefined : parseCondition(condition, text, line),
    items: splitTopLevel(items, ITEM_SEPARATOR).map((item) => parseItem(item, line, isTrigger)),
  };
};

// The first form that matches wins: entity, resources, timer, then free text.
const parseCondition = (condition: string, text: string, line: number): BuildOrderCondition => {
  const [, name, event] = condition.match(ENTITY_CONDITION_PATTERN) ?? [];
  if (name !== undefined)
    return { type: 'entity', ...parseName(name, text, line), event: event === 'starts' ? 'starts' : 'done', line };
  if (RESOURCES_CONDITION_PATTERN.test(condition))
    return { type: 'resources', resources: parseResources(condition, line) };
  const [, seconds] = condition.match(TIMER_CONDITION_PATTERN) ?? [];
  if (seconds === undefined) return { type: 'text', text: condition };
  if (Number(seconds) > 59) throw lineError(line, `invalid time "${condition}". Use seconds from 00 to 59.`);
  return { type: 'timer', time: condition };
};

// "150 hexite and 100 flux", each resource once.
const parseResources = (condition: string, line: number) =>
  condition.split(/\s+and\s+/i).reduce<CostSegment[]>((resources, part) => {
    const [amount, name] = part.split(/\s+/);
    const resource = RESOURCES.find((candidate) => candidate === name.toLowerCase());
    if (!resource) throw lineError(line, `unknown resource "${name}". Use hexite or flux.`);
    if (Number(amount) === 0) throw lineError(line, `invalid amount "${part}". Use a number above 0.`);
    if (resources.some((other) => other.resource === resource))
      throw lineError(line, `resource "${resource}" is repeated. Use each resource once.`);
    return [...resources, { amount, resource }];
  }, []);

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
  for (const mark of used) if (!defined.has(mark)) throw new BuildOrderError(`note ^${mark} is not defined.`);
  for (const mark of defined) if (!used.has(mark)) throw new BuildOrderError(`note ^${mark} is never used.`);
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

const lineError = (line: number, message: string) => new BuildOrderError(message, line);

class BuildOrderError extends Error {
  detail: string;
  line?: number;

  constructor(detail: string, line?: number) {
    super(`bo${line === undefined ? '' : ` line ${line}`}: ${detail}`);
    this.detail = detail;
    this.line = line;
  }
}

// "bo block 2, line 3: ...": the line is relative to the branch block.
const inBranch = <Result>(block: number, run: () => Result) => {
  try {
    return run();
  } catch (error) {
    if (!(error instanceof BuildOrderError)) throw error;
    throw new Error(`bo block ${block}${error.line === undefined ? '' : `, line ${error.line}`}: ${error.detail}`);
  }
};
