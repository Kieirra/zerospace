import { EntityIcon } from '../../../entity-icon/entity-icon.tsx';
import { toInputStatusLines, toTakenInputRows } from './merge-inputs.helpers.ts';
import type { BuildCatalog } from '../../../build-order.types.ts';
import type { OrderTiming, SimulationResult } from '../../../engine/engine.types.ts';

interface MergeInputsProps {
  order: OrderTiming;
  result: SimulationResult;
  catalog: BuildCatalog;
  onSelect: (stepUid: string) => void;
}

// 'Inputs' of a merge (US-009): the units it took, a click (or Enter) selects the step that made each one; else, when
// it never starts, how many of each input are free and which merges took the others.
export const MergeInputs = ({ order, result, catalog, onSelect }: MergeInputsProps) => {
  const rows = toTakenInputRows(order, result, catalog);
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-muted">Inputs</h4>
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-0.5 tabular-nums">
          {rows.map(({ stepUid, entity, name, laneLabel, readyAt }, index) => (
            <li key={`${stepUid}-${index}`}>
              <button
                type="button"
                onClick={() => onSelect(stepUid)}
                className="flex w-full cursor-pointer items-center gap-2 px-1 text-left hover:bg-surface-hover"
              >
                {entity && <EntityIcon entity={entity} />}
                <span className="flex-1">{name}</span>
                <span className="text-muted">{laneLabel}</span>
                <span>{readyAt}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-0.5 tabular-nums">
          {toInputStatusLines(order, result, catalog).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
