import { isMiscCategory, toCatalogMap } from '../build-order.helpers.ts';
import { toUidNumber } from '../build-editor/build-editor.helpers.ts';
import { toAfterStart, toWholeSeconds } from './bo-plan.anchors.ts';
import { toBoName } from './bo-plan.names.ts';
import type { Build, BuildCatalog } from '../build-order.types.ts';
import type { SimulationResult } from '../engine/engine.types.ts';
import type { BoCatalogs } from './bo-plan.import.ts';
import type { BoAnchor, BoGroup, BoItem, BoPlan } from './bo-plan.types.ts';

// An item being written, with the steps behind it.
interface ItemDraft {
  item: BoItem;
  at: number;
  uids: string[];
  // Items of its trigger `(-> …)`, one group.
  trigger?: ItemDraft[];
}

interface GroupDraft {
  anchor: BoAnchor;
  at: number;
  items: ItemDraft[];
}

interface ExportStep {
  uid: string;
  entityId: string;
  at: number;
}

// The build as a ```bo build order (Kieirra 2026-11-19), the reverse of toBuild: steps by time, then in their order.
// A step clicked one second after the start of the item before it joins its group (`+`), or the trigger of an earlier
// item of the group (`(-> …)`); copies at the same time count (`2 Bestiary`). Else a new group: `->` when it is
// clicked once the group before it is done, `when X starts:` or `when X done:` on the first step of an entity, else
// `when m:ss:`. A base opens a new group and a new phase. A unit in a loop is `(loop X)` on its building; the copies
// of a loop, the setup hero, the talents and the events (Kieirra 2026-11-20) are never written.
export const toBoPlan = (build: Build, result: SimulationResult, catalogs: BoCatalogs): BoPlan => {
  const catalog = toCatalogMap([...catalogs.faction.entities, ...(catalogs.mercenary?.entities ?? [])]);
  const timings = new Map(result.steps.map((timing) => [timing.stepUid, timing]));
  const startsOf = (uids: string[]) => uids.flatMap((uid) => timings.get(uid)?.startAt ?? []);
  const endsOf = (uids: string[]) => uids.flatMap((uid) => timings.get(uid)?.endAt ?? []);
  // Time of a step clicked after the start of every copy of the item, as toBuild places it; null when none started.
  const afterStartOf = ({ uids }: ItemDraft) => {
    const starts = startsOf(uids);
    return starts.length === 0 ? null : toAfterStart(Math.max(...starts));
  };
  const nextAt = (draft: ItemDraft) => afterStartOf(draft) ?? draft.at + 1;
  const loops = toLoopsByBuilding(build, timings);
  const firstUids = new Map<string, string>();
  const phases: GroupDraft[][] = [];
  let group: GroupDraft | null = null;
  let last: ItemDraft | null = null;

  const toDraft = ({ uid, entityId, at }: ExportStep): ItemDraft => {
    if (!firstUids.has(entityId)) firstUids.set(entityId, uid);
    const loop = loops.get(uid);
    return { item: { entityId, count: 1, ...(loop && { loop }) }, at, uids: [uid] };
  };

  const toAnchor = (at: number, before: GroupDraft | null): BoAnchor => {
    if (before === null) return at === 0 ? AFTER_PREVIOUS : { kind: 'time', seconds: at };
    const ends = endsOf(before.items.flatMap(({ uids }) => uids));
    if (at === (ends.length === 0 ? before.at : toWholeSeconds(Math.max(...ends)))) return AFTER_PREVIOUS;
    return findEntityAnchor(at, firstUids, timings, (entityId) => isNamed(entityId, catalog, catalogs)) ?? { kind: 'time', seconds: at };
  };

  const steps = toExportSteps(build, timings, catalog);
  for (const [index, step] of steps.entries()) {
    if (last && last.item.entityId === step.entityId && last.at === step.at) {
      last.item.count += 1;
      last.uids.push(step.uid);
      continue;
    }
    const isBase = isBaseStep(step, catalog);
    // Another step at the same time after this one, a base aside (it opens a group), and no step clicked after the start
    // of this one: toBuild placed this one as the trigger of the item before, the other one as the next item.
    const hasRival = steps
      .slice(index + 1)
      .some((other) => other.at === step.at && other.entityId !== step.entityId && !isBaseStep(other, catalog));
    const copies = steps.filter(({ entityId, at }) => entityId === step.entityId && at === step.at).map(({ uid }) => uid);
    const continuesAt = afterStartOf({ item: { entityId: step.entityId, count: 1 }, at: step.at, uids: copies });
    const isTriggerFirst = hasRival && !steps.some(({ at }) => at === continuesAt);
    const target = isBase || group === null ? null : findPlace(group, { at: step.at, isTriggerFirst }, nextAt, afterStartOf);
    if (target) {
      last = toDraft(step);
      target.push(last);
      continue;
    }
    // Read before the step joins the first steps: a group never waits for its own item.
    const anchor = toAnchor(step.at, group);
    last = toDraft(step);
    group = { anchor, at: step.at, items: [last] };
    if (phases.length === 0 || isBase) phases.push([]);
    phases[phases.length - 1].push(group);
  }
  return {
    factionId: build.factionId,
    mercenaryId: build.mercenaryId,
    heroId: build.heroId,
    title: build.title,
    author: build.author,
    phases: phases.map((groups, index) => ({ number: index + 1, groups: groups.map(toGroup) })),
  };
};

const AFTER_PREVIOUS: BoAnchor = { kind: 'after-previous' };

const isBaseStep = ({ entityId }: ExportStep, catalog: BuildCatalog) => catalog.get(entityId)?.economy?.kind === 'hexite-base';

// The list the step joins: after the last item of the group (`+`), after the last item of a trigger, or a new trigger
// on an earlier item that started one second before. On the last item `+` reads the same and wins, unless the step
// comes first among others at that time (`isTriggerFirst`): toBuild places the trigger of an item right after it,
// before the next item. null: a new group.
const findPlace = (
  group: GroupDraft,
  { at, isTriggerFirst }: { at: number; isTriggerFirst: boolean },
  nextAt: (draft: ItemDraft) => number,
  afterStartOf: (draft: ItemDraft) => number | null,
) => {
  if (!isTriggerFirst && at === nextAt(group.items[group.items.length - 1])) return group.items;
  const withTrigger = group.items.find(({ trigger }) => trigger && at === nextAt(trigger[trigger.length - 1]));
  if (withTrigger?.trigger) return withTrigger.trigger;
  const candidates = isTriggerFirst ? group.items : group.items.slice(0, -1);
  const triggered = candidates.find((draft) => !draft.trigger && at === afterStartOf(draft));
  if (!triggered && at === nextAt(group.items[group.items.length - 1])) return group.items;
  if (!triggered) return null;
  triggered.trigger = [];
  return triggered.trigger;
};

const toGroup = ({ anchor, items }: GroupDraft): BoGroup => ({ anchor, items: items.map(toItem) });

const toItem = ({ item, trigger }: ItemDraft): BoItem =>
  trigger ? { ...item, trigger: [{ anchor: AFTER_PREVIOUS, items: trigger.map(toItem) }] } : item;

const isNamed = (entityId: string, catalog: BuildCatalog, catalogs: BoCatalogs) => {
  const entity = catalog.get(entityId);
  return entity !== undefined && toBoName(entity, catalogs) !== null;
};

// `when X starts:` or `when X done:` on the first step of X, the latest such X first.
const findEntityAnchor = (
  at: number,
  firstUids: Map<string, string>,
  timings: Map<string, SimulationResult['steps'][number]>,
  canName: (entityId: string) => boolean,
): BoAnchor | null => {
  for (const [entityId, uid] of [...firstUids].reverse()) {
    const timing = timings.get(uid);
    if (!canName(entityId) || !timing) continue;
    if (timing.startAt !== null && toAfterStart(timing.startAt) === at) return { kind: 'entity', entityId, event: 'starts' };
    if (timing.endAt !== null && toWholeSeconds(timing.endAt) === at) return { kind: 'entity', entityId, event: 'done' };
  }
  return null;
};

// Steps outside the loops, talents and events aside, by time then uid. A unit without time takes the whole second of its
// simulated click.
const toExportSteps = (build: Build, timings: Map<string, SimulationResult['steps'][number]>, catalog: BuildCatalog) => {
  const steps = [...build.timed, ...build.queued.filter(({ repeat }) => !repeat)].flatMap((step): ExportStep[] => {
    const entity = catalog.get(step.entityId);
    if (!entity || isMiscCategory(entity)) return [];
    const clickAt = timings.get(step.uid)?.clickAt;
    const at = step.at ?? (clickAt === null || clickAt === undefined ? null : toWholeSeconds(clickAt));
    return [{ uid: step.uid, entityId: step.entityId, at: at ?? Infinity }];
  });
  const latest = Math.max(0, ...steps.flatMap(({ at }) => (Number.isFinite(at) ? [at] : [])));
  return steps
    .map((step) => (Number.isFinite(step.at) ? step : { ...step, at: latest }))
    .sort((a, b) => a.at - b.at || toUidNumber(a.uid) - toUidNumber(b.uid));
};

// Unit of the loop of each building step: its pin, else the lane that made it.
const toLoopsByBuilding = (build: Build, timings: Map<string, SimulationResult['steps'][number]>) =>
  new Map(
    build.queued.flatMap(({ uid, entityId, producerUid, repeat }) => {
      const buildingUid = producerUid ?? timings.get(uid)?.laneId?.replace(/^lane:/, '');
      return repeat && buildingUid ? [[buildingUid, entityId] as const] : [];
    }),
  );
