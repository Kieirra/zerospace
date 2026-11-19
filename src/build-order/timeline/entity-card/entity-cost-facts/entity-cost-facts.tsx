import { toDurationLabel } from '../../../build-order.helpers.ts';
import { CostAmount } from '../../../cost-amount/cost-amount.tsx';
import { SupplyAmount } from '../../../supply-amount/supply-amount.tsx';
import type { BuildEntity } from '../../../build-order.types.ts';

interface EntityCostFactsProps {
  entity: BuildEntity;
}

// Cost and supply of one production, one a line (Kieirra 2026-11-19), and its time ('?' when unknown).
export const EntityCostFacts = ({ entity }: EntityCostFactsProps) => (
  <span className="flex flex-col gap-1">
    {entity.cost.hexite > 0 && <CostAmount resource="hexite" amount={entity.cost.hexite} />}
    {entity.cost.flux > 0 && <CostAmount resource="flux" amount={entity.cost.flux} />}
    {entity.supply > 0 && <SupplyAmount amount={entity.supply} />}
    <span className="text-muted">
      Time <span className="text-text tabular-nums">{toDurationLabel(entity.duration)}</span>
    </span>
  </span>
);
