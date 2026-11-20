import { formatClock, toCapableProducerUids } from '../build-order.helpers.ts';
import { getResearchLocation } from '../engine/engine.research-location.ts';
import { MISC_LANE_ID } from '../engine/engine.constants.ts';
import { toLaneId } from '../engine/engine.state.ts';
import { RESEARCH_LOCATIONS } from '../game-data/game-data.constants.ts';
import { isReplicateStep } from '../engine/engine.replicate.ts';
import {
  AXIS_LABEL_SECONDS,
  END_MARGIN_SECONDS,
  MIN_TIMELINE_SECONDS,
  SETUP_HERO_KEY,
  VISIBLE_SECONDS,
  WAIT_LABEL_MIN_SECONDS,
} from './timeline.constants.ts';
import { groupFreeUnits, isFreeUnit, toFreeUnitWhere, toMiscTimesLabel } from './timeline.misc.ts';
import type { Build, BuildCatalog, BuildEntity, EntityCategory } from '../build-order.types.ts';
import type { OrderTiming, SimulationResult } from '../engine/engine.types.ts';
import type { LegendKind, TimelineItem, TimelineItemEvents, TimelineItemShape } from './timeline.types.ts';

// The whole axis fits the frame up to VISIBLE_SECONDS; a longer one keeps that scale and scrolls (Kieirra 2026-11-19).
export const toPixelsPerSecond = (frameWidth: number, totalSeconds: number) =>
  frameWidth / Math.min(totalSeconds, VISIBLE_SECONDS);

export const toTimeScale = (endTime: number, availableWidth: number) => {
  const totalSeconds = toTimelineSeconds(endTime);
  return { totalSeconds, pixelsPerSecond: toPixelsPerSecond(availableWidth, totalSeconds) };
};

// End of the axis: rounded up to the next label after the last end, at least MIN_TIMELINE_SECONDS.
export const toTimelineSeconds = (endTime: number) =>
  Math.max(MIN_TIMELINE_SECONDS, Math.ceil((endTime + END_MARGIN_SECONDS) / AXIS_LABEL_SECONDS) * AXIS_LABEL_SECONDS);

// First fit by start time; an interval shorter than minSpan still keeps minSpan free. Rows in input order.
export const packRows = (intervals: { start: number; end: number }[], minSpan = 0) => {
  const rows = new Array<number>(intervals.length).fill(0);
  const rowEnds: number[] = [];
  const order = intervals.map((_, index) => index).sort((a, b) => intervals[a].start - intervals[b].start);
  for (const index of order) {
    const { start, end } = intervals[index];
    const row = rowEnds.findIndex((rowEnd) => start >= rowEnd);
    const target = row === -1 ? rowEnds.length : row;
    rowEnds[target] = Math.max(end, start + minSpan);
    rows[index] = target;
  }
  return rows;
};

// One item per order, plus the setup hero; rows are set by toProducerLanes. A unit never taken by a building shows on
// its pinned lane, else on the first lane able to make it, with its never-starts mark. A unit with a time waits from
// that time, not from its entry in the production queue (Kieirra 2026-11-19). A unit in a loop is named « ∞ Exalted »,
// the copies of its loop « Exalted », each from its own click; a Replicate copy « Replicate Synapse » (US-009). The free
// units of a step made at once share one item.
export const toTimelineItems = (result: SimulationResult, catalog: BuildCatalog, build: Pick<Build, 'timed' | 'queued'>): TimelineItem[] => {
  const laneLabels = new Map(result.lanes.map(({ id, label }) => [id, label]));
  const queuedAts = new Map(build.queued.flatMap(({ uid, at }) => (at === undefined ? [] : [[uid, at]])));
  const repeatedUids = new Set(build.queued.filter(({ repeat }) => repeat).map(({ uid }) => uid));
  const copyUids = new Set(build.queued.filter(isReplicateStep).map(({ uid }) => uid));
  const stepsWithError = new Set(
    result.steps.filter(({ diagnostics }) => diagnostics.some(({ severity }) => severity === 'error')).map(({ stepUid }) => stepUid),
  );
  const researchBuildingIds = new Set(
    [...catalog.values()]
      .filter(({ category }) => category === 'research')
      .flatMap((research) => getResearchLocation(research, catalog, RESEARCH_LOCATIONS) ?? []),
  );
  const items = result.orders.flatMap((order): TimelineItem[] => {
    const entity = catalog.get(order.entityId);
    if (!entity) return [];
    // The free units of a talent or an event stay on its Misc lane.
    const shape = order.laneId === MISC_LANE_ID ? 'misc' : SHAPES[entity.category];
    const laneId = order.laneId ?? toWaitingLaneId(order.stepUid, entity, build, catalog, laneLabels);
    const isCopy = order.occurrence > 0;
    const stepAt = isCopy ? undefined : queuedAts.get(order.stepUid);
    const timing = { clickAt: stepAt ?? order.clickAt, startAt: order.startAt };
    const isLoopStep = !isCopy && repeatedUids.has(order.stepUid);
    return [
      {
        stepUid: order.stepUid,
        occurrence: order.occurrence,
        entityId: order.entityId,
        count: 1,
        shape,
        isMercenary: entity.category === 'mercenary-building',
        isResearchBuilding: entity.category === 'building' && researchBuildingIds.has(entity.id),
        laneId,
        label:
          shape === 'mercenary'
            ? `${entity.displayName} ×${entity.count}`
            : `${isLoopStep ? '∞ ' : ''}${copyUids.has(order.stepUid) ? 'Replicate ' : ''}${entity.displayName}`,
        where: isFreeUnit({ shape, occurrence: order.occurrence })
          ? toFreeUnitWhere(order.stepUid, build, catalog)
          : (laneLabels.get(laneId ?? '') ?? ''),
        clickAt: timing.clickAt,
        startAt: order.startAt,
        endAt: order.endAt,
        waitLabel: toWaitLabel(timing),
        isClickedEarly: isOrderClickedEarly(timing),
        hasClickTime: stepAt !== undefined || build.timed.some(({ uid }) => uid === order.stepUid),
        neverStartsFrom: result.lanes.find(({ id }) => id === laneId)?.readyAt ?? 0,
        hasError: stepsWithError.has(order.stepUid),
        row: 0,
      },
    ];
  });
  const setupHero = toSetupHeroItem(result, catalog);
  return setupHero ? [...groupFreeUnits(items), setupHero] : groupFreeUnits(items);
};

// Kinds present in the build, in legend order (Hero always last).
export const toLegendKinds = (items: TimelineItem[]) => {
  const present = new Set<LegendKind>(
    items
      .filter(({ isResearchBuilding }) => !isResearchBuilding)
      .map(({ shape }) => (shape === 'setup-hero' ? 'hero' : shape)),
  );
  if (items.some(({ isResearchBuilding }) => isResearchBuilding)) present.add('research-building');
  if (items.some(({ isClickedEarly }) => isClickedEarly)) present.add('clicked-early');
  return LEGEND_ORDER.filter((kind) => present.has(kind));
};

// 'Click 1:35 · Starts 1:47 · Ready 2:23'; the setup hero has no click; a Misc step 'Applied at 2:10'.
export const toItemTimesLabel = (item: TimelineItem) => {
  const { shape, clickAt, startAt, endAt } = item;
  if (shape === 'setup-hero') return `free · picked at match start, at base ${formatClock(startAt ?? 0)}`;
  if (shape === 'misc') return toMiscTimesLabel(item);
  return [
    clickAt === null ? null : `Click ${formatClock(clickAt)}`,
    startAt === null ? 'Never starts' : `Starts ${formatClock(startAt)}`,
    endAt === null ? null : `Ready ${formatClock(endAt)}`,
  ]
    .filter((part) => part !== null)
    .join(' · ');
};

// 'Sentinel, Barracks, clicked 1:35, starts 1:47, ready 2:23'
export const toItemAriaLabel = (item: TimelineItem) =>
  [item.label, item.where, toItemTimesLabel(item).replace('Click', 'clicked').toLowerCase().replaceAll(' · ', ', ')]
    .filter((part) => part !== '')
    .join(', ');

// Hover or focus highlights the step, never a tooltip (Kieirra 2026-11-19); a click opens it: shared by every timeline
// mark button.
export const toItemButtonProps = (item: TimelineItem, events: TimelineItemEvents) => {
  const enter = () => events.onEnter(item);
  return {
    'aria-label': toItemAriaLabel(item),
    // Every mark of a step: the editor finds where its step panel goes.
    'data-step-uid': item.stepUid,
    // A copy of a loop is never dragged.
    'data-copy': item.occurrence > 0 || undefined,
    onMouseEnter: enter,
    onFocus: enter,
    onMouseLeave: events.onLeave,
    onBlur: events.onLeave,
    onClick: (event: { currentTarget: HTMLElement; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) events.onToggle(item);
      else events.onOpen(item, event.currentTarget);
    },
  };
};

// Pinned lane of a queued step, else the first lane of the build able to make it, else the starting base.
const toWaitingLaneId = (
  stepUid: string,
  entity: BuildEntity,
  build: Pick<Build, 'timed' | 'queued'>,
  catalog: BuildCatalog,
  laneLabels: Map<string, string>,
) => {
  const pinned = build.queued.find(({ uid }) => uid === stepUid)?.producerUid;
  const uids = [...(pinned === undefined ? [] : [pinned]), ...toCapableProducerUids(entity, build, catalog)];
  const laneId = uids.map((uid) => toLaneId({ uid })).find((id) => laneLabels.has(id));
  return laneId ?? [...laneLabels.keys()][0] ?? null;
};

const toSetupHeroItem = (result: SimulationResult, catalog: BuildCatalog): TimelineItem | null => {
  const setup = result.heroes.setup;
  const hero = setup ? catalog.get(setup.entityId) : undefined;
  if (!setup || !hero) return null;
  return {
    stepUid: SETUP_HERO_KEY,
    occurrence: 0,
    entityId: hero.id,
    count: 1,
    shape: 'setup-hero',
    isMercenary: false,
    isResearchBuilding: false,
    laneId: null,
    label: hero.displayName,
    where: '',
    clickAt: null,
    startAt: setup.at,
    endAt: setup.at,
    waitLabel: null,
    isClickedEarly: false,
    hasClickTime: false,
    neverStartsFrom: 0,
    hasError: false,
    row: 0,
  };
};

// Clicked at another displayed second than its start. A step that never starts shows its never-starts mark alone, no
// endless wait (Kieirra 2026-11-19).
const isOrderClickedEarly = ({ clickAt, startAt }: Pick<OrderTiming, 'clickAt' | 'startAt'>) =>
  clickAt !== null && startAt !== null && formatClock(startAt) !== formatClock(clickAt);

const toWaitLabel = ({ clickAt, startAt }: Pick<OrderTiming, 'clickAt' | 'startAt'>) => {
  if (clickAt === null || startAt === null) return null;
  return startAt - clickAt >= WAIT_LABEL_MIN_SECONDS ? `+${formatClock(startAt - clickAt)}` : null;
};

const SHAPES: Record<EntityCategory, Exclude<TimelineItemShape, 'setup-hero'>> = {
  building: 'building',
  'mercenary-building': 'building',
  unit: 'unit',
  harvester: 'unit',
  research: 'research',
  transformation: 'research',
  'mercenary-unit': 'mercenary',
  hero: 'hero',
  talent: 'misc',
  event: 'misc',
  merge: 'unit',
  replicate: 'unit',
};

const LEGEND_ORDER: LegendKind[] = [
  'building',
  'research-building',
  'unit',
  'research',
  'mercenary',
  'misc',
  'clicked-early',
  'hero',
];
