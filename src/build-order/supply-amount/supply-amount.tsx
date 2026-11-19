import { formatSupply } from '../build-order.helpers.ts';

interface SupplyAmountProps {
  amount: number;
}

// Supply a production takes (a pack counts every unit), next to its cost: the wiki's supply icon and the amount.
export const SupplyAmount = ({ amount }: SupplyAmountProps) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums" title="Supply">
    <img src="/images/wiki/icons/supply.webp" alt="Supply" width={16} height={16} className="size-4" />
    <span className="text-text">{formatSupply(amount)}</span>
  </span>
);
