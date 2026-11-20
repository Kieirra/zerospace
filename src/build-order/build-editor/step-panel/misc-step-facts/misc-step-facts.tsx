import { toAppliedLabel } from '../../../timeline/timeline.misc.ts';
import { ERROR_COLOR } from '../../../timeline/timeline.styles.ts';

interface MiscStepFactsProps {
  effectLines: string[];
  // Seconds; null: it never applies (a Reinforcements without free supply).
  appliedAt: number | null;
}

// What a talent or an event does and when it applied (US-008), read only.
export const MiscStepFacts = ({ effectLines, appliedAt }: MiscStepFactsProps) => (
  <div className="flex flex-col gap-1 tabular-nums">
    <ul className="flex flex-col gap-0.5">
      {effectLines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
    <p style={appliedAt === null ? { color: ERROR_COLOR } : undefined}>{toAppliedLabel(appliedAt)}</p>
  </div>
);
