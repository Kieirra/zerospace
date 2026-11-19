import { formatAmount } from '../build-order.helpers.ts';
import { KIND_COLORS } from '../build-order.constants.ts';
import type { Resource } from '../engine/engine.types.ts';

interface CostAmountProps {
  resource: Resource;
  amount: number;
}

const RESOURCE_LABELS: Record<Resource, string> = { hexite: 'Hexite', flux: 'Flux' };

export const CostAmount = ({ resource, amount }: CostAmountProps) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums" style={{ color: KIND_COLORS[resource] }}>
    <img src={`/images/wiki/icons/${resource}.webp`} alt={RESOURCE_LABELS[resource]} width={16} height={16} className="size-4" />
    <span className="text-text">{formatAmount(amount)}</span>
  </span>
);
