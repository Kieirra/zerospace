import { KIND_COLORS } from '../../../../build-order.constants.ts';
import { NeverStartsMark } from '../../../never-starts-mark/never-starts-mark.tsx';
import { PointMark } from '../../../point-mark/point-mark.tsx';
import { TimelineBar } from '../../../timeline-bar/timeline-bar.tsx';
import { toMiscMarkAt, toMiscMarkPx } from '../../../timeline.misc.ts';
import type { TimelineItem, TimelineItemEvents, TimelineItemShape, TimeScale } from '../../../timeline.types.ts';

interface LaneMarkProps {
  item: TimelineItem & { shape: Exclude<TimelineItemShape, 'setup-hero'> };
  scale: TimeScale;
  imageUrl?: string;
  // Room left free at the start of a bar (click mark drawn over it).
  contentInset: number;
  isHighlighted: boolean;
  isSelected: boolean;
  events: TimelineItemEvents;
}

const MERCENARY_DIAMOND_PX = 12;
const MISC_DIAMOND_PX = 10;

// The mark of a step on its lane, after its click wait.
export const LaneMark = ({ item, scale, imageUrl, contentInset, isHighlighted, isSelected, events }: LaneMarkProps) => {
  const { shape, startAt, endAt } = item;
  const shared = { scale, isHighlighted, isSelected, events };
  // Talent or event (US-008): on its time, else its click (a Reinforcements that never applies), as wide as a recruit
  // and its ✕ at most.
  if (shape === 'misc') {
    return (
      <PointMark
        item={item}
        at={toMiscMarkAt(item)}
        imageUrl={imageUrl}
        color={KIND_COLORS.misc}
        diamondPx={MISC_DIAMOND_PX}
        maxWidth={toMiscMarkPx(item)}
        {...shared}
      />
    );
  }
  if (startAt === null) return <NeverStartsMark item={item} from={item.clickAt ?? item.neverStartsFrom} {...shared} />;
  // Instant recruit.
  if (shape === 'mercenary') {
    return <PointMark item={item} at={startAt} imageUrl={imageUrl} color={KIND_COLORS.mercenary} diamondPx={MERCENARY_DIAMOND_PX} {...shared} />;
  }
  return (
    <TimelineBar item={{ ...item, shape }} startAt={startAt} endAt={endAt ?? startAt} imageUrl={imageUrl} contentInset={contentInset} {...shared} />
  );
};
