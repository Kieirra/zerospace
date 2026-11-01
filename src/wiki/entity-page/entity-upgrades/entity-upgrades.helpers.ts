import { byTierThenOrder } from '../../wiki.helpers.ts';
import type { Entity } from '../../wiki.types.ts';

export interface UpgradeRow {
  isChoice: boolean;
  upgrades: Entity[];
}

// One row per exclusive group (a choice, rendered with "or"), one row per tier for the other upgrades.
// Rows follow their first upgrade in tier order, as exclusive groups can mix tiers.
export const groupUpgradeRows = (upgrades: Entity[]) => {
  const rows = new Map<string, Entity[]>();
  for (const upgrade of [...upgrades].sort(byTierThenOrder)) {
    const key = upgrade.exclusiveGroup ? `group:${upgrade.exclusiveGroup}` : `tier:${upgrade.tier ?? ''}`;
    rows.set(key, [...(rows.get(key) ?? []), upgrade]);
  }
  return [...rows].map(
    ([key, members]): UpgradeRow => ({ isChoice: key.startsWith('group:') && members.length > 1, upgrades: members }),
  );
};
