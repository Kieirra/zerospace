import type { Build, BuildCatalog } from '../build-order.types.ts';
import type { SimulationResult } from '../engine/engine.types.ts';

export interface TimelineViewProps {
  result: SimulationResult;
  build: Build;
  catalog: BuildCatalog;
  highlightedStepUid: string | null;
  onHighlight: (stepUid: string | null) => void;
}

export type TimelineItemShape = 'building' | 'unit' | 'research' | 'mercenary' | 'hero' | 'setup-hero';

export interface TimelineItem {
  // 'setup-hero' for the setup hero.
  stepUid: string;
  entityId: string;
  shape: TimelineItemShape;
  // Mercenary building: same bevelled bar, mercenary color.
  isMercenary: boolean;
  // Building where research is done: research color, building shape.
  isResearchBuilding: boolean;
  // Engine lane (building instance) of the order; a unit never taken shows on its pinned lane or the first capable one.
  laneId: string | null;
  label: string;
  // Lane label of the order ('Barracks #2'); '' outside any lane.
  where: string;
  clickAt: number | null;
  startAt: number | null;
  endAt: number | null;
  // '+0:12' when the wait is 6 s or more, 'Never starts' when the order never starts.
  waitLabel: string | null;
  isClickedEarly: boolean;
  // The build sets its click time (a timed step, a unit with a time): its click mark is a handle (Kieirra 2026-11-19).
  hasClickTime: boolean;
  // Never taken by a building: where its never-starts mark begins (end of construction of its lane, else 0).
  neverStartsFrom: number;
  hasError: boolean;
  row: number;
}

export interface DisplayLane {
  // Engine lane id (building instance) or 'setup-hero'.
  id: string;
  label: string;
  // 'ready 0:52'
  summary: string;
  rowCount: number;
  items: TimelineItem[];
  // Mercenary building only: each time one of its slots can be spent.
  slotMarks: SlotMark[];
}

export interface SlotMark {
  t: number;
  // Slots ready right after this mark, out of `max`.
  count: number;
  max: number;
}

export type LegendKind =
  | 'building'
  | 'research-building'
  | 'unit'
  | 'research'
  | 'mercenary'
  | 'mercenary-slot'
  | 'clicked-early'
  | 'idle'
  | 'hero';

export interface TimeScale {
  totalSeconds: number;
  pixelsPerSecond: number;
}

export interface TimelineItemEvents {
  onEnter: (item: TimelineItem) => void;
  onLeave: () => void;
  onOpen: (item: TimelineItem, element: HTMLElement) => void;
  // Ctrl/Cmd or Shift + click.
  onToggle: (item: TimelineItem) => void;
}

export interface IdleSpan {
  from: number;
  to: number;
  // 'idle 0:14' from WAIT_LABEL_MIN_SECONDS, null below.
  label: string | null;
}

export interface LaneNote {
  text: string;
  tone: 'click' | 'warn' | 'muted';
}

// Producer lane with its idle gaps, ready mark and right label.
export interface FullLane extends DisplayLane {
  // End of construction; null for the starting base and the lanes outside any building.
  readyAt: number | null;
  idle: IdleSpan[];
  // 'queued 0:14' or 'stacks ?/4'.
  rightLabel: LaneNote | null;
}

export interface CurvePoint {
  t: number;
  value: number;
}

export interface ResourceTrack {
  points: CurvePoint[];
  // Top of the vertical scale.
  max: number;
  // 'peak 685', '12 free'.
  label: string;
}

export interface ResourceTracks {
  hexite: ResourceTrack;
  flux: ResourceTrack;
  // Supply free; null when the supply is not checked (the row is hidden).
  supply: ResourceTrack | null;
}

export interface GameStateAt {
  t: number;
  hexite: number;
  flux: number;
  supplyUsed: number;
  supplyCap: number | null;
  isSupplyChecked: boolean;
}
