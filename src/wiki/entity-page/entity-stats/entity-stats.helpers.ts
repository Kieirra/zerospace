import {
  toGameStatTiles,
  formatTargets,
  formatArmor,
  formatCost,
  formatNumber,
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
    { label: 'Starting charges', value: formatOptionalNumber(entity.productionCharges?.initial) },
    { label: 'Max charges', value: formatOptionalNumber(entity.productionCharges?.max) },
    { label: 'Charge time', value: formatOptionalSeconds(entity.productionCharges?.recharge) },
    { label: 'Research time', value: formatOptionalSeconds(entity.researchTime) },
    // Units cost supply, buildings provide it: a single tile, the provided supply signed to tell them apart.
    { label: 'Supply', value: formatOptionalNumber(entity.supply) ?? formatSupplyProvided(entity.supplyProvided) },
    { label: 'HP', value: formatOptionalNumber(entity.hp) },
    ...toGameStatTiles(entity.combatStats),
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
    { label: 'Targets', value: formatTargets(entity) },
    { label: 'Transport slots', value: formatOptionalNumber(entity.transport?.capacity) },
    { label: 'Transport units', value: formatOptionalNumber(entity.transport?.unitCapacity) },
    // The accepted targets list can be long: let it span two tiles instead of growing tall.
    { label: 'Transport accepts', value: entity.transport && formatTargets(entity.transport), span: 2 },
  ]);

const formatSupplyProvided = (value?: number) => (value === undefined ? undefined : `+${formatNumber(value)}`);

const toBatch = ({ cost, count = 1 }: Entity) => {
  const batchCost = formatCost(cost);
  return count > 1 && batchCost ? { count, cost: batchCost } : undefined;
};
