import { PRODUCTION_CHARGES_OVERRIDES, REPLICATE_TOPBAR_ID, UNIT_OWNER_LIMITS } from '../game-data/game-data.constants.ts';
import type { Entity } from '../../wiki/wiki.types.ts';
import type { BuildCatalog, BuildEntity } from '../build-order.types.ts';

// Xol units (US-009): merges, Replicate copies and units made by a production charge.

// Supplement paid to merge: the data cost of the merge minus the data cost per unit of its inputs (cost / count), never
// below 0 per resource. Always read from the data costs, never from a cost already reduced.
export const toMergeCost = (merge: Pick<Entity, 'cost' | 'mergedFrom'>, dataEntities: Entity[]): BuildEntity['cost'] => {
  const inputs = (merge.mergedFrom ?? []).map(({ id, count }) => ({ input: dataEntities.find((entity) => entity.id === id), count }));
  const toSupplement = (resource: 'hexite' | 'flux') =>
    Math.max(
      0,
      inputs.reduce(
        (rest, { input, count }) => rest - ((input?.cost?.[resource] ?? 0) / (input?.count ?? 1)) * count,
        merge.cost?.[resource] ?? 0,
      ),
    );
  return { hexite: toSupplement('hexite'), flux: toSupplement('flux') };
};

// '2 Roller', 'Defiant + Synapse + Echo': the recipe of a merge, in units.
export const toMergeRecipeLine = (entity: Pick<BuildEntity, 'mergedFrom'>, catalog: BuildCatalog) =>
  (entity.mergedFrom ?? [])
    .map(({ entityId, count }) => {
      const name = catalog.get(entityId)?.name ?? entityId;
      return count > 1 ? `${count} ${name}` : name;
    })
    .join(' + ');

// Fields of a Xol unit, left out of any other entity: its recipe, its Replicate energy and its owner limit.
export const toXolFields = (entity: Pick<Entity, 'id' | 'mergedFrom' | 'topbarEnergyCosts'>): Partial<BuildEntity> => {
  const replicateEnergy = entity.topbarEnergyCosts?.[REPLICATE_TOPBAR_ID];
  const ownerLimit = UNIT_OWNER_LIMITS[entity.id];
  return {
    ...(entity.mergedFrom && { mergedFrom: entity.mergedFrom.map(({ id, count }) => ({ entityId: id, count })) }),
    ...(replicateEnergy !== undefined && { replicateEnergy }),
    ...(ownerLimit !== undefined && { ownerLimit }),
  };
};

// A unit every producer of which makes it with a charge comes out at once (Kieirra 2026-11-20, provisional): the build
// times of the assets are not used.
export const isMadeByCharge = ({ producedBy = [] }: Pick<Entity, 'producedBy'>) =>
  producedBy.length > 0 && producedBy.every((id) => id in PRODUCTION_CHARGES_OVERRIDES);
