import { ClickHandle } from '../../click-handle/click-handle.tsx';
import { ClickWait } from '../../click-wait/click-wait.tsx';
import { toClickMarkAt, toContentInset } from '../../click-wait/click-wait.helpers.ts';
import { FreeUnitMark } from '../../free-unit-mark/free-unit-mark.tsx';
import { SetupHeroMark } from '../../setup-hero-mark/setup-hero-mark.tsx';
import { isFreeUnit } from '../../timeline.misc.ts';
import { LaneMark } from './lane-mark/lane-mark.tsx';
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
  const { shape, startAt } = item;
  const shared = { scale, isHighlighted, events };
  if (shape === 'setup-hero') return <SetupHeroMark item={item} at={startAt ?? 0} imageUrl={imageUrl} {...shared} />;
  if (isFreeUnit(item)) return <FreeUnitMark item={item} at={startAt ?? 0} imageUrl={imageUrl} isSelected={isSelected} {...shared} />;
  const markAt = toClickMarkAt(item);
  const contentInset = toContentInset(item, markAt, scale);
  return (
    <>
      {markAt !== null && <ClickWait item={item} clickAt={markAt} {...shared} />}
      {markAt !== null && item.hasClickTime && <ClickHandle item={item} clickAt={markAt} scale={scale} />}
      <LaneMark item={{ ...item, shape }} imageUrl={imageUrl} contentInset={contentInset} isSelected={isSelected} {...shared} />
    </>
  );
};
