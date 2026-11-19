import { formatClock } from '../build-order.helpers.ts';
import { toSlotMarks } from './slot-marks/slot-marks.helpers.ts';
import { MERCENARY_MARK_PX, SETUP_HERO_KEY } from './timeline.constants.ts';
import { packRows } from './timeline.helpers.ts';
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
  const minSpan = MERCENARY_MARK_PX / scale.pixelsPerSecond;
  return [...groups.entries()]
    .map(([id, laneItems]) => ({ id, laneItems, beginsAt: id === startingLaneId ? -Infinity : Math.min(...laneItems.map(toStartAt)) }))
    .sort((a, b) => a.beginsAt - b.beginsAt || (engineRank.get(a.id) ?? Infinity) - (engineRank.get(b.id) ?? Infinity))
    .map(({ id, laneItems }) => {
      // One interval per order, from its click (else its never-starts mark) to its end.
      const rows = packRows(
        laneItems.map((item) => {
          const start = toBeginAt(item);
          const end = item.endAt ?? scale.totalSeconds;
          return { start, end: item.shape === 'mercenary' ? Math.max(end, start + minSpan) : end };
        }),
      );
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

const toBeginAt = ({ clickAt, startAt, neverStartsFrom }: TimelineItem) => clickAt ?? startAt ?? neverStartsFrom;

const toStartAt = ({ clickAt, startAt, neverStartsFrom }: TimelineItem) => startAt ?? clickAt ?? neverStartsFrom;

const toLaneTitle = (id: string, lane: Lane | undefined) => {
  if (id === SETUP_HERO_KEY) return { label: 'Hero', summary: 'picked at start' };
  if (!lane) return { label: id, summary: '' };
  return { label: lane.label, summary: lane.isStarting ? 'starting base' : `ready ${formatClock(lane.readyAt)}` };
};
