import { formatClock, getLongestWait } from '../../build-order.helpers.ts';
import type { BuildCatalog, BuildEntity } from '../../build-order.types.ts';
import type { OrderTiming, SimulationResult, StepTiming, WaitReason } from '../../engine/engine.types.ts';

interface PanelBox {
  width: number;
  height: number;
}

interface PanelViewport {
  width: number;
  height: number;
}

// Room kept between the panel and its mark, and from the window edges.
const PANEL_GAP_PX = 8;

// What the wait texts name: the requirements ('waits Barracks'), the unit a merge or a copy waits for ('waits Roller',
// US-009), and whether the step spends a mercenary slot or a production charge.
export interface WaitNames {
  requirement: string;
  unit: string;
  isRecruit: boolean;
}

// A row of facts before the times ('Cost', 'Energy', 'Supply'); an empty label continues the row above.
export interface StepFact {
  label: string;
  value: string;
}

// Messages of the errors of the step; warnings and infos are left out.
export const toStepErrors = ({ diagnostics }: Pick<StepTiming, 'diagnostics'>) =>
  diagnostics.filter(({ severity }) => severity === 'error').map(({ message }) => message);

// Times of the step read in its panel (Kieirra 2026-11-19), those of the former hover tooltip: Click when no Click at
// field shows it (a unit made as soon as possible: when it entered its building's queue), Start, Ready; after its facts.
export const toStepTimeRows = (
  timing: Pick<StepTiming, 'clickAt' | 'startAt' | 'endAt'>,
  waits: OrderTiming['waits'],
  names: WaitNames,
  stepAt?: number,
  facts: StepFact[] = [],
) => [
  ...facts.map((fact) => ({ ...fact, isError: false })),
  ...(stepAt === undefined && timing.clickAt !== null ? [{ label: 'Click', value: formatClock(timing.clickAt), isError: false }] : []),
  { label: 'Start', value: toStartText(timing.startAt, waits, names), isError: timing.startAt === null },
  ...(timing.endAt === null ? [] : [{ label: 'Ready', value: formatClock(timing.endAt), isError: false }]),
];

// 'Talent · Level 2', 'Event' (US-008); 'Merge · Molten Core', 'Replicate · Top bar' (US-009); null for any other step.
export const toStepSubtitle = ({ category, level }: Pick<BuildEntity, 'category' | 'level'>, isCopy: boolean, requirement: string) => {
  if (isCopy) return 'Replicate · Top bar';
  if (category === 'merge') return `Merge · ${requirement}`;
  if (category === 'talent') return `Talent · Level ${level}`;
  return category === 'event' ? 'Event' : null;
};

// The unit a merge or a copy waits for (US-009): the target of a copy; the first input of a merge that never starts
// still missing, in recipe order; else the input it took ready the latest.
export const toWaitedUnitName = (entity: BuildEntity, isCopy: boolean, order: OrderTiming | undefined, result: SimulationResult, catalog: BuildCatalog) => {
  if (isCopy || entity.category !== 'merge') return entity.name;
  const missing = order?.inputStatus?.find(({ count, free }) => free < count)?.entityId;
  const last = order?.inputs?.reduce<NonNullable<OrderTiming['inputs']>[number] | undefined>(
    (latest, input) => (!latest || input.readyAt > latest.readyAt ? input : latest),
    undefined,
  );
  const lastId = last && result.orders.find(({ stepUid, occurrence }) => stepUid === last.stepUid && occurrence === last.occurrence)?.entityId;
  return catalog.get(missing ?? lastId ?? '')?.name ?? entity.name;
};

// Under the mark, else above it when the window is too short below; always inside the window.
export const toPanelPosition = (anchor: Pick<DOMRect, 'left' | 'top' | 'bottom'>, panel: PanelBox, viewport: PanelViewport) => {
  const left = clamp(anchor.left, PANEL_GAP_PX, viewport.width - panel.width - PANEL_GAP_PX);
  const below = anchor.bottom + PANEL_GAP_PX;
  const above = anchor.top - PANEL_GAP_PX - panel.height;
  const top = below + panel.height <= viewport.height - PANEL_GAP_PX || above < PANEL_GAP_PX ? below : above;
  return { left, top: clamp(top, PANEL_GAP_PX, viewport.height - panel.height - PANEL_GAP_PX) };
};

// '2:41 · waits Hexite', 'Never starts · waits supply': the longest wait of the step. `reserved` (held behind an order
// saving for its resources) has no text of its own in the specs: none shown.
const toStartText = (startAt: number | null, waits: OrderTiming['waits'], names: WaitNames) => {
  const reason = getLongestWait(waits);
  const text = reason === undefined ? undefined : toWaitText(reason, names);
  return [startAt === null ? 'Never starts' : formatClock(startAt), ...(text ? [text] : [])].join(' · ');
};

const toWaitText = (reason: WaitReason, { requirement, unit, isRecruit }: WaitNames) => {
  switch (reason) {
    case 'hexite':
      return 'waits Hexite';
    case 'flux':
      return 'waits Flux';
    case 'supply':
      return 'waits supply';
    case 'producer-busy':
      return 'waits for its building';
    case 'requirement':
      return `waits ${requirement}`;
    case 'stack':
      return isRecruit ? 'waits a mercenary slot' : 'waits a charge';
    case 'units':
      return `waits ${unit}`;
    case 'reserved':
      return undefined;
  }
};

// Max before min: a panel wider than the window sticks to its left edge.
const clamp = (value: number, min: number, max: number) => Math.max(Math.min(value, max), min);
