import { useState } from 'react';
import { useScrollListener } from '../../hooks/use-scroll-listener.ts';
import { SETUP_HERO_KEY } from '../timeline.constants.ts';
import { useTimelineEditing } from '../timeline-editing.ts';
import type { TimelineItem, TimelineItemEvents } from '../timeline.types.ts';

export interface AnchoredItem {
  item: TimelineItem;
  element: HTMLElement;
  // Viewport rectangle of the element, refreshed on scroll (the card is fixed).
  anchor: DOMRect;
}

// Hovered mark (highlight, no tooltip: Kieirra 2026-11-19) and opened mark (entity card) of a timeline.
// In the editor a click selects the step of the mark instead, a modifier click toggles it (TimelineEditing).
export const useItemPopovers = (onHighlight: (stepUid: string | null) => void) => {
  const [opened, setOpened] = useState<AnchoredItem | null>(null);
  const editing = useTimelineEditing();

  useScrollListener(opened !== null, () => setOpened(toReanchored));

  const events: TimelineItemEvents = {
    onEnter: (item) => onHighlight(item.stepUid),
    onLeave: () => onHighlight(null),
    onOpen: (item, element) => {
      if (isStep(item)) {
        editing.onSelect(item.stepUid);
        return;
      }
      setOpened({ item, element, anchor: element.getBoundingClientRect() });
    },
    onToggle: (item) => {
      if (isStep(item)) editing.onToggle(item.stepUid);
    },
  };

  return { opened, events, close: () => setOpened(null) };
};

const toReanchored = (anchored: AnchoredItem | null) =>
  anchored && { ...anchored, anchor: anchored.element.getBoundingClientRect() };

// The setup hero is no step: its mark keeps its entity card.
const isStep = ({ stepUid }: TimelineItem) => stepUid !== SETUP_HERO_KEY;
