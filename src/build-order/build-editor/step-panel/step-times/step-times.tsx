import { ERROR_COLOR } from '../../../timeline/timeline.styles.ts';
import { toStepTimeRows } from '../step-panel.helpers.ts';
import type { OrderTiming, StepTiming } from '../../../engine/engine.types.ts';

interface StepTimesProps {
  timing: StepTiming;
  waits: OrderTiming['waits'];
  // Requirement names for 'waits Barracks'.
  requirement: string;
  // Click time of the step, shown by its Click at field; undefined for a unit made as soon as possible.
  stepAt?: number;
}

// Click, Start and Ready of the step panel (Kieirra 2026-11-19), read only, aligned with its fields.
export const StepTimes = ({ timing, waits, requirement, stepAt }: StepTimesProps) => (
  <dl className="flex flex-col gap-1 tabular-nums">
    {toStepTimeRows(timing, waits, requirement, stepAt).map(({ label, value, isError }) => (
      <div key={label} className="flex items-center gap-2">
        <dt className="w-16 shrink-0 text-muted">{label}</dt>
        <dd style={isError ? { color: ERROR_COLOR } : undefined}>{value}</dd>
      </div>
    ))}
  </dl>
);
