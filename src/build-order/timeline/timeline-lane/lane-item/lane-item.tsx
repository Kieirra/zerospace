import { ClickHandle } from '../../click-handle/click-handle.tsx';
import { ClickWait } from '../../click-wait/click-wait.tsx';
import { toClickMarkAt, toContentInset } from '../../click-wait/click-wait.helpers.ts';
import { MercenaryMark } from '../../mercenary-mark/mercenary-mark.tsx';
import { NeverStartsMark } from '../../never-starts-mark/never-starts-mark.tsx';
import { SetupHeroMark } from '../../setup-hero-mark/setup-hero-mark.tsx';
import { TimelineBar } from '../../timeline-bar/timeline-bar.tsx';
import type { TimelineItem, TimelineItemEvents, TimeScale } from '../../timeline.types.ts';

interface LaneItemProps {
  item: TimelineItem;
  scale: TimeScale;
  imageUrl?: string;
  isHighlighted: boolean;
  isSelected: boolean;
  events: TimelineItemEvents;
}

export const LaneItem = ({ item, scale, imageUrl, isHighlighted, isSelected, events }: LaneItemProps) => {
  const { shape, startAt, endAt } = item;
  const shared = { scale, isHighlighted, events };
  if (shape === 'setup-hero') return <SetupHeroMark item={item} at={startAt ?? 0} imageUrl={imageUrl} {...shared} />;
  const markAt = toClickMarkAt(item);
  const contentInset = toContentInset(item, markAt, scale);
  return (
    <>
      {markAt !== null && <ClickWait item={item} clickAt={markAt} {...shared} />}
      {markAt !== null && item.hasClickTime && <ClickHandle item={item} clickAt={markAt} scale={scale} />}
      {startAt === null && (
        <NeverStartsMark item={item} from={item.clickAt ?? item.neverStartsFrom} isSelected={isSelected} {...shared} />
      )}
      {startAt !== null &&
        (shape === 'mercenary' ? (
          <MercenaryMark item={item} startAt={startAt} imageUrl={imageUrl} isSelected={isSelected} {...shared} />
        ) : (
          <TimelineBar
            item={{ ...item, shape }}
            startAt={startAt}
            endAt={endAt ?? startAt}
            imageUrl={imageUrl}
            contentInset={contentInset}
            isSelected={isSelected}
            {...shared}
          />
        ))}
    </>
  );
};
