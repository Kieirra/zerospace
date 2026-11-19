import clsx from 'clsx';
import { useWindowFitHeight } from '../../hooks/use-window-fit-height.ts';
import { DropLabel } from '../drop-label/drop-label.tsx';
import { DropMark } from '../drop-mark/drop-mark.tsx';
import { useBarDrag } from '../hooks/use-bar-drag.ts';
import { toLanesPointer } from '../hooks/use-bar-drag.helpers.ts';
import { useMiddlePan } from '../hooks/use-middle-pan.ts';
import { usePaletteDrop } from '../hooks/use-palette-drop.ts';
import { useSelectionRect } from '../hooks/use-selection-rect.ts';
import { useStepMenu } from '../hooks/use-step-menu.ts';
import { useWheelScroll } from '../hooks/use-wheel-scroll.ts';
import { SelectionRect } from '../selection-rect/selection-rect.tsx';
import { StepMenu } from '../step-menu/step-menu.tsx';
import { TimelineAxis } from '../timeline-axis/timeline-axis.tsx';
import { AXIS_HEIGHT_PX, LABEL_COLUMN_PX, TIMELINE_BACKGROUND, TRACK_END_PADDING_PX } from '../timeline.constants.ts';
import { useTimelineEditing } from '../timeline-editing.ts';
import type { HTMLAttributes, ReactNode, RefObject } from 'react';
import type { TimeScale } from '../timeline.types.ts';

interface TimelineFrameProps {
  frameRef: RefObject<HTMLDivElement | null>;
  scale: TimeScale;
  // Pointer and keyboard handlers of the time cursor (empty when it is disabled).
  zoneProps: HTMLAttributes<HTMLDivElement>;
  cursorAt: number | null;
  // Read by screen readers when the cursor moves with the keyboard.
  announcement: string;
  children: ReactNode;
}

// Scrolling frame of a timeline: axis, lanes and the vertical line of the time cursor. Its height stops at the bottom
// of the window (Kieirra 2026-11-19): the lanes scroll up and down by the wheel or the scrollbar, the axis staying on
// top, and sideways by Shift + wheel (useWheelScroll) or the scrollbar; a trackpad scrolls both ways; the wheel button
// held then moved pans both ways; never by dragging: a drag moves a mark. Editor (TimelineEditing): a mark dragged
// sideways moves its time, a click handle its click time alone,
// a palette card dropped on the lanes adds its step there, a press anywhere else on the timeline (curves, axis, void of
// the lanes) draws a selection rectangle, a right click on a mark opens its menu; the pointer over the lanes is where a
// paste lands.
// Room of the scrollbars always kept (no jump past 3 minutes), thin thumbs in the theme line color.
// Under the frame: the padding and border of its panel (13), the main bottom padding and the footer (56).
const BOTTOM_CHROME_PX = 69;
const MIN_HEIGHT_PX = 240;

export const TimelineFrame = ({ frameRef, scale, zoneProps, cursorAt, announcement, children }: TimelineFrameProps) => {
  const editing = useTimelineEditing();
  const barDrag = useBarDrag(frameRef, scale, editing);
  const paletteDrop = usePaletteDrop(frameRef, scale, editing);
  const selectionRect = useSelectionRect(frameRef, editing);
  const stepMenu = useStepMenu(editing);
  useWheelScroll(frameRef);
  const isPanning = useMiddlePan(frameRef);
  const maxHeight = useWindowFitHeight(frameRef, BOTTOM_CHROME_PX, MIN_HEIGHT_PX);
  const drag = barDrag.drag ?? paletteDrop.drag;
  return (
    <div
      ref={frameRef}
      className={clsx(
        // Relative: the announcement (sr-only) stays inside, never below the page.
        'relative overflow-scroll',
        '[scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent]',
        '[&::-webkit-scrollbar]:size-1.5 [&::-webkit-scrollbar-thumb]:bg-line [&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-corner]:bg-transparent',
        'border border-line pt-1.5 pb-2.5 select-none',
        isPanning && 'cursor-grabbing [&_*]:cursor-grabbing',
        barDrag.isRefused && 'cursor-not-allowed [&_*]:cursor-not-allowed',
        barDrag.drag?.source.kind === 'step' && 'cursor-grabbing [&_*]:cursor-grabbing',
        barDrag.drag?.source.kind === 'click' && 'cursor-ew-resize [&_*]:cursor-ew-resize',
      )}
      style={{ background: TIMELINE_BACKGROUND, maxHeight: maxHeight ?? undefined }}
    >
      <div
        {...zoneProps}
        {...paletteDrop.dropProps}
        // Where the focus goes back when the step panel closes on a removed step.
        data-timeline-zone=""
        onPointerDown={(event) => {
          barDrag.onPointerDown(event);
          selectionRect.onPointerDown(event);
        }}
        onContextMenu={stepMenu.onContextMenu}
        onPointerMove={(event) => {
          zoneProps.onPointerMove?.(event);
          editing.onLanesHover(toLanesPointer(event, frameRef.current, scale));
        }}
        onPointerLeave={(event) => {
          zoneProps.onPointerLeave?.(event);
          editing.onLanesHover(null);
        }}
        // The icons of the marks would start the browser's own image drag and swallow the mark drag.
        onDragStart={(event) => event.preventDefault()}
        className={clsx(
          'relative w-max focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-soft',
          '[&_[data-step-uid]:not([data-copy])]:cursor-grab',
        )}
        style={{ paddingRight: TRACK_END_PADDING_PX }}
      >
        {/* Above the lane names (z-10), under the drop marks drawn after it; at the very top, over the frame's padding. */}
        <div className="sticky -top-1.5 z-[11]" style={{ background: TIMELINE_BACKGROUND }}>
          <TimelineAxis scale={scale} />
          {drag && <DropLabel drag={drag} scale={scale} />}
        </div>
        {children}
        {drag && <DropMark drag={drag} scale={scale} />}
        <SelectionRect rect={selectionRect.rect} />
        {cursorAt !== null && !drag && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 border-l border-white/75"
            style={{ left: LABEL_COLUMN_PX + cursorAt * scale.pixelsPerSecond, top: AXIS_HEIGHT_PX - 4, zIndex: 5 }}
          />
        )}
      </div>
      {stepMenu.request && <StepMenu request={stepMenu.request} onClose={stepMenu.close} />}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
};
