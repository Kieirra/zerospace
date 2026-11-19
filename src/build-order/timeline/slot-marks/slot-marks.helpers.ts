import type { StackGauge } from '../../engine/engine.types.ts';
import type { LegendKind, SlotMark } from '../timeline.types.ts';

// Each time a mercenary slot can be spent: the building completes with its first stacks, then one more per
// recharge (90 s in the data) until the max (Mazar 2026-11-14). None when the stack rule is a guess.
export const toSlotMarks = (stacks: StackGauge | undefined): SlotMark[] => {
  if (!stacks?.isKnown) return [];
  return stacks.points.flatMap(({ t, count }, index) => {
    const previous = index === 0 ? 0 : stacks.points[index - 1].count;
    return count > previous ? [{ t, count, max: stacks.max }] : [];
  });
};

// 'Mercenary slot 1:30 · 2/4 ready'
export const toSlotMarkTitle = ({ count, max }: SlotMark, clock: string) => `Mercenary slot ${clock} · ${count}/${max} ready`;

// The legend shows the slot mark only when a lane draws one, right after the mercenary diamond.
export const withSlotLegend = (kinds: LegendKind[], lanes: { slotMarks: SlotMark[] }[]): LegendKind[] => {
  if (!lanes.some(({ slotMarks }) => slotMarks.length > 0)) return kinds;
  const index = kinds.indexOf('mercenary');
  return index === -1 ? [...kinds, 'mercenary-slot'] : [...kinds.slice(0, index + 1), 'mercenary-slot', ...kinds.slice(index + 1)];
};
