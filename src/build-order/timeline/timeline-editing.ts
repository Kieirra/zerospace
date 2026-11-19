import { createContext, useContext } from 'react';

// What is dragged onto the timeline: a step of the build (one of its marks, on its lane), the click handle of a step
// (Kieirra 2026-11-19) or an entity of the palette.
export type DragSource =
  | { kind: 'step'; uid: string; laneId: string | null }
  | { kind: 'click'; uid: string }
  | { kind: 'entity'; entityId: string };

// Where a drag ends: the time under the pointer, the whole seconds moved since the press, the lane under the pointer.
export interface DropTarget {
  t: number;
  delta: number;
  laneId: string | null;
}

// Shown while dragging: 'Click 2:35 · starts ≈ 2:41'.
export interface DropPreview {
  label: string;
  // The drop changes nothing (a mark released where it was taken).
  isSamePlace: boolean;
  // Click time the drop records (Kieirra 2026-11-19), the line on the axis; null for a unit without a time.
  at: number | null;
  // Lane the dragged units, or the unit of a palette card, are pinned on; null when they stay on their lane.
  laneId: string | null;
  // Unit a palette card adds (Kieirra 2026-11-19), for its ghost on `laneId`: where it starts, else its click time.
  added?: AddedMark;
}

export interface AddedMark {
  startAt: number;
  seconds: number;
  label: string;
}

// Pointer over a lane: the time under it and its lane, where a paste lands (Kieirra 2026-11-19).
export interface LanesPointer {
  t: number;
  laneId: string;
}

// Editor only. A click on a mark selects its step instead of opening the entity card (the setup hero, not a step,
// keeps its card), Ctrl/Cmd or Shift + click adds or takes it out; a press anywhere on the timeline but a mark draws a
// selection rectangle. Dragging the mark of a step sideways moves its time `at`, with the selection, a unit's included; units
// dragged to another lane are pinned there and moved in time; a palette card dropped on the lanes is added at the time
// under the pointer, a unit on the lane under it (Kieirra 2026-11-19). Dragging the click handle of a step moves its time `at`
// alone, its start left to the simulation. A refused drop has no preview.
export interface TimelineEditing {
  selectedUids: ReadonlySet<string>;
  onSelect: (stepUid: string) => void;
  onToggle: (stepUid: string) => void;
  onSelectRect: (stepUids: string[], isAdditive: boolean) => void;
  onClearSelection: () => void;
  // null: the pointer left the lanes.
  onLanesHover: (pointer: LanesPointer | null) => void;
  // A unit that never starts and has no time has nothing to move from: not draggable.
  canDrag: (stepUid: string) => boolean;
  previewDrop: (source: DragSource, target: DropTarget) => DropPreview | null;
  onDrop: (source: DragSource, target: DropTarget) => void;
  // Right-click menu and ✕ of a mark (Kieirra 2026-11-19): the removal (Undo in the toast) and the duplication of the
  // keyboard.
  onRemove: (stepUids: string[]) => void;
  onDuplicate: (stepUids: string[]) => void;
}

export const TimelineEditingContext = createContext<TimelineEditing | null>(null);

// Always given by EditorTimeline, the only timeline of the tool.
export const useTimelineEditing = () => {
  const editing = useContext(TimelineEditingContext);
  if (!editing) throw new Error('useTimelineEditing: no TimelineEditingContext above this timeline.');
  return editing;
};

// Data type of a palette card dragged with the browser's drag and drop.
export const ENTITY_DRAG_TYPE = 'application/x-zerospace-entity';

// The card being dragged: the browser hides the dragged data until the drop, the preview needs it before.
export const draggedEntity: { id: string | null } = { id: null };
