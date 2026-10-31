import {
  formatArmor,
  formatCost,
  formatOptionalDistance,
  formatOptionalNumber,
  formatOptionalSeconds,
  formatUnitCost,
  keepFilledTiles,
} from '../../wiki.helpers.ts';
import type { Entity } from '../../wiki.types.ts';

export const buildStatTiles = (entity: Entity) =>
  keepFilledTiles([
    { label: 'Cost', value: formatUnitCost(entity), batch: toBatch(entity) },
    { label: 'Build time', value: formatOptionalSeconds(entity.buildTime) },
    { label: 'Research time', value: formatOptionalSeconds(entity.researchTime) },
    { label: 'Supply', value: formatOptionalNumber(entity.supply) },
    { label: 'HP', value: formatOptionalNumber(entity.hp) },
    { label: 'Shields', value: formatOptionalNumber(entity.shields) },
    { label: 'Armor rating', value: formatOptionalNumber(entity.armorRating) },
    { label: 'Armor type', value: formatArmor(entity) },
    { label: 'Energy', value: formatOptionalNumber(entity.energy) },
    { label: 'Speed', value: formatOptionalNumber(entity.speed) },
    { label: 'Vision', value: formatOptionalDistance(entity.vision) },
    {
      label: 'Energy cost',
      value: typeof entity.energyCost === 'number' ? formatOptionalNumber(entity.energyCost) : undefined,
    },
    { label: 'Cooldown', value: formatOptionalSeconds(entity.cooldown) },
    { label: 'Range', value: formatOptionalDistance(entity.range) },
    { label: 'Charges', value: formatOptionalNumber(entity.charges) },
  ]);

const toBatch = ({ cost, count = 1 }: Entity) => {
  const batchCost = formatCost(cost);
  return count > 1 && batchCost ? { count, cost: batchCost } : undefined;
};
