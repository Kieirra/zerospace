import { getResearchLocation } from '../engine/engine.research-location.ts';
import { RESEARCH_LOCATIONS } from '../game-data/game-data.constants.ts';
import type { BuildEntity } from '../build-order.types.ts';

// What the tool offers of a side (Kieirra 2026-11-19). A research no building can host is left out for now: the
// upgrades done on a unit (Terror Tank, Dreadnought, Xol molten units…), whose units are no lanes. A unit made only by
// the building of its name is that building (Dreadnought, Terror Tank, Strider): the unit is left out, the building
// takes its supply and keeps its own cost and time. Offered entities sharing a name tell apart by their display name,
// `name` unchanged (D4): the upgraded entity, else the kind ('Performance Enhancers (Steelsworn)').
export const toOfferedEntities = (entities: BuildEntity[]) => {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const unitByBuildingId = new Map(entities.flatMap((entity) => toBuildingUnit(entity, byId)));
  const offered = entities
    .filter((entity) => !isBuildingUnit(entity, byId))
    .filter((entity) => entity.category !== 'research' || getResearchLocation(entity, byId, RESEARCH_LOCATIONS) !== undefined)
    .map((entity) => {
      const unit = unitByBuildingId.get(entity.id);
      return unit ? { ...entity, supply: unit.supply } : entity;
    });
  const counts = new Map<string, number>();
  for (const { name, isVariant } of offered) if (!isVariant) counts.set(name, (counts.get(name) ?? 0) + 1);
  return offered.map((entity) =>
    entity.isVariant || (counts.get(entity.name) ?? 0) < 2 ? entity : { ...entity, displayName: `${entity.name} (${toTarget(entity, byId)})` },
  );
};

// The building of the same name and side, when it is the only producer of the unit.
const findOwnBuilding = (unit: BuildEntity, byId: Map<string, BuildEntity>) => {
  if (unit.category !== 'unit' || unit.producedBy.length !== 1) return undefined;
  const building = byId.get(unit.producedBy[0]);
  return building?.category === 'building' && building.name === unit.name ? building : undefined;
};

const isBuildingUnit = (entity: BuildEntity, byId: Map<string, BuildEntity>) => findOwnBuilding(entity, byId) !== undefined;

const toBuildingUnit = (entity: BuildEntity, byId: Map<string, BuildEntity>): [string, BuildEntity][] => {
  const building = findOwnBuilding(entity, byId);
  return building ? [[building.id, entity]] : [];
};

const toTarget = (entity: BuildEntity, byId: Map<string, BuildEntity>) =>
  (entity.kind === 'upgrade' ? byId.get(entity.appliesTo[0] ?? '')?.name : undefined) ?? entity.kind;
