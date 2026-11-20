import { formatClock } from '../build-order.helpers.ts';
import { toSlotMarks } from './slot-marks/slot-marks.helpers.ts';
import { toClickMarkAt, toContentInset } from './click-wait/click-wait.helpers.ts';
import { toBarWidthPx } from './timeline-bar/timeline-bar.helpers.ts';
import { MISC_LANE_ID } from '../engine/engine.constants.ts';
import { POINT_MARK_PX, SETUP_HERO_KEY } from './timeline.constants.ts';
import { packRows } from './timeline.helpers.ts';
import { toMiscMarkAt, toMiscMarkPx } from './timeline.misc.ts';
import type { Lane } from '../engine/engine.types.ts';
import type { DisplayLane, TimelineItem, TimeScale } from './timeline.types.ts';

// One lane per building instance: the building bar, then everything it produces or researches on the same lane.
// Lanes go top to bottom in the order their first bar starts (start, else click), like the setup hero, which
// gets its own lane at its spawn time (Mazar 2026-11-14): a building clicked early sits at its real start.
// The starting base always comes first, even with nothing made there; its name on the left is enough, no bar
// (Mazar 2026-11-17).
export const toProducerLanes = (items: TimelineItem[], engineLanes: Lane[], scale: TimeScale): DisplayLane[] => {
  const groups = new Map<string, TimelineItem[]>();
  const startingLaneId = engineLanes.find(({ isStarting }) => isStarting)?.id;
  if (startingLaneId !== undefined) groups.set(startingLaneId, []);
  const fallbackId = startingLaneId ?? engineLanes[0]?.id ?? SETUP_HERO_KEY;
  for (const item of items) {
    const id = toGroupId(item, fallbackId);
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  const engineLaneById = new Map(engineLanes.map((lane) => [lane.id, lane]));
  const engineRank = new Map(engineLanes.map(({ id }, index) => [id, index]));
  return [...groups.entries()]
    .map(([id, laneItems]) => ({ id, laneItems, beginsAt: isPinnedLane(id, startingLaneId) ? -Infinity : Math.min(...laneItems.map(toStartAt)) }))
    .sort((a, b) => a.beginsAt - b.beginsAt || (engineRank.get(a.id) ?? Infinity) - (engineRank.get(b.id) ?? Infinity))
    .map(({ id, laneItems }) => {
      // One interval per order, from its click (else its never-starts mark) to the end of its mark: a chip wider than
      // its time (Kieirra 2026-11-19) takes the next row rather than covering the next mark.
      const rows = packRows(laneItems.map((item) => ({ start: toBeginAt(item), end: toMarkEnd(item, scale) })));
      const placed = laneItems.map((item, index) => ({ ...item, row: rows[index] }));
      return {
        id,
        ...toLaneTitle(id, engineLaneById.get(id)),
        rowCount: Math.max(1, ...placed.map(({ row }) => row + 1)),
        items: placed,
        slotMarks: toSlotMarks(engineLaneById.get(id)?.stacks),
      };
    });
};

// No lane at all only without a starting base: such an order joins the first lane (Kieirra 2026-11-19).
const toGroupId = ({ stepUid, laneId }: TimelineItem, fallbackId: string) => (stepUid === SETUP_HERO_KEY ? SETUP_HERO_KEY : (laneId ?? fallbackId));

// Starting base first, the Misc lane next: both begin at -Infinity, the engine rank puts the base first.
const isPinnedLane = (id: string, startingLaneId?: string) => id === startingLaneId || id === MISC_LANE_ID;

// A recruit keeps room for its label; a Misc mark, for the whole of its label or icon from its time, whatever its wait
// before: no other mark shows on its row there.
const toMarkEnd = (item: TimelineItem, scale: TimeScale) => {
  if (item.shape === 'misc') return toMiscMarkAt(item) + toMiscMarkPx(item) / scale.pixelsPerSecond;
  const end = item.endAt ?? scale.totalSeconds;
  if (item.shape === 'mercenary') return Math.max(end, toBeginAt(item) + POINT_MARK_PX / scale.pixelsPerSecond);
  if (item.startAt === null) return end;
  const inset = toContentInset(item, toClickMarkAt(item), scale);
  const width = toBarWidthPx(end - item.startAt, item.shape === 'unit', inset, scale.pixelsPerSecond);
  return Math.max(end, item.startAt + width / scale.pixelsPerSecond);
};

const toBeginAt = ({ clickAt, startAt, neverStartsFrom }: TimelineItem) => clickAt ?? startAt ?? neverStartsFrom;

const toStartAt = ({ clickAt, startAt, neverStartsFrom }: TimelineItem) => startAt ?? clickAt ?? neverStartsFrom;

const toLaneTitle = (id: string, lane: Lane | undefined) => {
  if (id === SETUP_HERO_KEY) return { label: 'Hero', summary: 'picked at start' };
  if (id === MISC_LANE_ID) return { label: 'Misc', summary: '' };
  if (!lane) return { label: id, summary: '' };
  return { label: lane.label, summary: lane.isStarting ? 'starting base' : `ready ${formatClock(lane.readyAt)}` };
};
