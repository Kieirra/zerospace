import { toTakerText } from '../merge-inputs/merge-inputs.helpers.ts';
import type { BuildCatalog } from '../../../build-order.types.ts';
import type { OrderTiming, SimulationResult } from '../../../engine/engine.types.ts';

interface MergedIntoProps {
  takenBy: NonNullable<OrderTiming['takenBy']>;
  // Units the step makes: 2 for a pack of Rollers, 1 for a merge or a copy.
  madeCount: number;
  result: SimulationResult;
  catalog: BuildCatalog;
  onSelect: (stepUid: string) => void;
}

// 'Merged into' of a unit a merge took (US-009): one line per merge, 'Echo 1:40', or '1 of 2 · Gravitron 2:10' when it
// took part of the pack; a click (or Enter) selects the merge.
export const MergedInto = ({ takenBy, madeCount, result, catalog, onSelect }: MergedIntoProps) => (
  <div className="flex flex-col gap-1">
    <h4 className="text-muted">Merged into</h4>
    <ul className="flex flex-col gap-0.5 tabular-nums">
      {takenBy.map(({ stepUid, startAt, count }) => (
        <li key={stepUid}>
          <button type="button" onClick={() => onSelect(stepUid)} className="w-full cursor-pointer px-1 text-left hover:bg-surface-hover">
            {count < madeCount ? `${count} of ${madeCount} · ` : ''}
            {toTakerText(result, catalog, stepUid, startAt)}
          </button>
        </li>
      ))}
    </ul>
  </div>
);
