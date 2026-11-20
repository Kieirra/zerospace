import { formatClock } from '../build-order.helpers.ts';
import { FREE_UNIT_COUNT_PX, FREE_UNIT_MARK_PX, POINT_MARK_PX, REMOVE_BUTTON_PX, VISIBLE_SECONDS } from './timeline.constants.ts';
import type { Build, BuildCatalog } from '../build-order.types.ts';
import type { TimelineItem } from './timeline.types.ts';

// Misc lane (US-008): the talents and events of the build, and the free units they make.

export const isFreeUnit = ({ shape, occurrence }: Pick<TimelineItem, 'shape' | 'occurrence'>) => shape === 'misc' && occurrence > 0;

// A free unit names the step that made it: 'from Unending Army'.
export const toFreeUnitWhere = (stepUid: string, build: Pick<Build, 'timed'>, catalog: BuildCatalog) => {
  const entityId = build.timed.find(({ uid }) => uid === stepUid)?.entityId;
  const name = entityId === undefined ? undefined : catalog.get(entityId)?.displayName;
  return name === undefined ? '' : `from ${name}`;
};

// The free units of a step made at the same time share one point, named with their count: '6 Commando'.
export const groupFreeUnits = (items: TimelineItem[]) => {
  const counts = new Map<string, number>();
  for (const item of items) if (isFreeUnit(item)) counts.set(toFreeUnitKey(item), (counts.get(toFreeUnitKey(item)) ?? 0) + 1);
  const shown = new Set<string>();
  return items.flatMap((item) => {
    if (!isFreeUnit(item)) return [item];
    const key = toFreeUnitKey(item);
    if (shown.has(key)) return [];
    shown.add(key);
    const count = counts.get(key) ?? 1;
    return [count > 1 ? { ...item, count, label: `${count} ${item.label}` } : item];
  });
};

// Time of a Misc mark: when it applies, else its click (a Reinforcements that never applies, a talent already taken).
export const toMiscMarkAt = ({ startAt, clickAt }: Pick<TimelineItem, 'startAt' | 'clickAt'>) => startAt ?? clickAt ?? 0;

// Room a Misc mark takes right of its time: the point of a free unit, its icon and count, else a step, its label and
// the room of its ✕.
export const toMiscMarkPx = (item: Pick<TimelineItem, 'shape' | 'occurrence' | 'count'>) => {
  if (!isFreeUnit(item)) return POINT_MARK_PX + REMOVE_BUTTON_PX;
  return FREE_UNIT_MARK_PX + (item.count > 1 ? FREE_UNIT_COUNT_PX : 0);
};

// Last second the Misc marks reach, at the widest scale (VISIBLE_SECONDS on the track): the axis covers it, no point cut.
export const toMiscEndTime = (items: TimelineItem[], trackWidth: number) =>
  Math.max(
    0,
    ...items.filter(({ shape }) => shape === 'misc').map((item) => toMiscMarkAt(item) + (toMiscMarkPx(item) * VISIBLE_SECONDS) / trackWidth),
  );

// 'Applied at 2:10', 'Never applies'; a free unit, its time alone.
export const toMiscTimesLabel = (item: Pick<TimelineItem, 'shape' | 'occurrence' | 'startAt'>) =>
  isFreeUnit(item) && item.startAt !== null ? formatClock(item.startAt) : toAppliedLabel(item.startAt);

// 'Applied at 2:10', else 'Never applies' (a Reinforcements without free supply).
export const toAppliedLabel = (appliedAt: number | null) => (appliedAt === null ? 'Never applies' : `Applied at ${formatClock(appliedAt)}`);

const toFreeUnitKey = ({ stepUid, entityId, startAt }: TimelineItem) => `${stepUid} ${entityId} ${startAt}`;
