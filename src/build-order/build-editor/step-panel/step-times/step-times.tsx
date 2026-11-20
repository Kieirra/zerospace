import { ERROR_COLOR } from '../../../timeline/timeline.styles.ts';
import { toStepTimeRows } from '../step-panel.helpers.ts';
import type { OrderTiming, StepTiming } from '../../../engine/engine.types.ts';
import type { StepFact, WaitNames } from '../step-panel.helpers.ts';

interface StepTimesProps {
  timing: StepTiming;
  waits: OrderTiming['waits'];
  // Names of the wait texts: 'waits Barracks', 'waits Roller'.
  names: WaitNames;
  // Click time of the step, shown by its Click at field; undefined for a unit made as soon as possible.
  stepAt?: number;
  // Read only rows before the times: the cost of a merge, the energy and supply of a copy (US-009).
  facts?: StepFact[];
}

// Click, Start and Ready of the step panel (Kieirra 2026-11-19), read only, aligned with its fields, after its facts.
export const StepTimes = ({ timing, waits, names, stepAt, facts }: StepTimesProps) => (
  <dl className="flex flex-col gap-1 tabular-nums">
    {toStepTimeRows(timing, waits, names, stepAt, facts).map(({ label, value, isError }) => (
      <div key={`${label}-${value}`} className="flex items-center gap-2">
        <dt className="w-16 shrink-0 text-muted">{label}</dt>
        <dd style={isError ? { color: ERROR_COLOR } : undefined}>{value}</dd>
      </div>
    ))}
  </dl>
);
