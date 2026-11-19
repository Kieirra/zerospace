import { formatClock, getLongestWait } from '../../build-order.helpers.ts';
import type { OrderTiming, StepTiming, WaitReason } from '../../engine/engine.types.ts';

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

// Messages of the errors of the step; warnings and infos are left out.
export const toStepErrors = ({ diagnostics }: Pick<StepTiming, 'diagnostics'>) =>
  diagnostics.filter(({ severity }) => severity === 'error').map(({ message }) => message);

// Times of the step read in its panel (Kieirra 2026-11-19), those of the former hover tooltip: Click when no Click at
// field shows it (a unit made as soon as possible: when it entered its building's queue), Start, Ready.
export const toStepTimeRows = (
  timing: Pick<StepTiming, 'clickAt' | 'startAt' | 'endAt'>,
  waits: OrderTiming['waits'],
  requirement: string,
  stepAt?: number,
) => [
  ...(stepAt === undefined && timing.clickAt !== null ? [{ label: 'Click', value: formatClock(timing.clickAt), isError: false }] : []),
  { label: 'Start', value: toStartText(timing.startAt, waits, requirement), isError: timing.startAt === null },
  ...(timing.endAt === null ? [] : [{ label: 'Ready', value: formatClock(timing.endAt), isError: false }]),
];

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
const toStartText = (startAt: number | null, waits: OrderTiming['waits'], requirement: string) => {
  const reason = getLongestWait(waits);
  const text = reason === undefined ? undefined : toWaitText(reason, requirement);
  return [startAt === null ? 'Never starts' : formatClock(startAt), ...(text ? [text] : [])].join(' · ');
};

const toWaitText = (reason: WaitReason, requirement: string) => {
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
      return 'waits a mercenary slot';
    case 'reserved':
      return undefined;
  }
};

// Max before min: a panel wider than the window sticks to its left edge.
const clamp = (value: number, min: number, max: number) => Math.max(Math.min(value, max), min);
