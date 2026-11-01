import { OTHER_GROUP } from '../wiki.constants.ts';
import { byName, byOrderThenName } from '../wiki.helpers.ts';
import type { Entity } from '../wiki.types.ts';

export interface EntityGroup {
  title: string;
  order?: number;
  entities: Entity[];
}

// Groups follow the game order of the entity they are named after (producer building, upgraded unit), Other last.
export const groupEntities = (
  entities: Entity[],
  getGroupId: (entity: Entity) => string | undefined,
  names: Map<string, Entity>,
) => {
  const groups = new Map<string, EntityGroup>();
  for (const entity of entities) {
    const groupId = getGroupId(entity);
    const groupEntity = groupId ? names.get(groupId) : undefined;
    const title = groupId ? (groupEntity?.name ?? groupId) : OTHER_GROUP;
    const group = groups.get(title) ?? { title, order: groupEntity?.order, entities: [] };
    groups.set(title, { ...group, entities: [...group.entities, entity] });
  }
  return [...groups.values()].sort(byOrderWithOtherLast);
};

// An upgraded building follows the building it comes from, one depth level further.
export const nestUpgradedBuildings = (buildings: Entity[]) => {
  const ids = new Set(buildings.map(({ id }) => id));
  const upgradesOf = (id: string) => buildings.filter(({ upgradedFrom }) => upgradedFrom === id).sort(byOrderThenName);
  const withUpgrades = (building: Entity, depth: number): { building: Entity; depth: number }[] => [
    { building, depth },
    ...upgradesOf(building.id).flatMap((upgraded) => withUpgrades(upgraded, depth + 1)),
  ];
  return buildings
    .filter(({ upgradedFrom }) => upgradedFrom === undefined || !ids.has(upgradedFrom))
    .sort(byOrderThenName)
    .flatMap((building) => withUpgrades(building, 0));
};

// A level where the faction offers a single talent is completed by the talent of the chosen mercenary.
export const getMercenaryChoices = (levels: { level?: number; entities: Entity[] }[], mercenaryTalents: Entity[]) => {
  const choices = new Map<number | undefined, Entity[]>();
  for (const { level, entities } of levels) {
    const talents = mercenaryTalents.filter((talent) => talent.level === level).sort(byName);
    if (entities.length === 1 && talents.length > 0) choices.set(level, talents);
  }
  return choices;
};

export const groupByLevel = (entities: Entity[]) =>
  [...new Set(entities.map(({ level }) => level))]
    .sort((a, b) => (a ?? Infinity) - (b ?? Infinity))
    .map((level) => ({
      level,
      entities: entities
        .filter((entity) => entity.level === level)
        .sort((a, b) => (a.position ?? '').localeCompare(b.position ?? '')),
    }));

const byOrderWithOtherLast = (a: EntityGroup, b: EntityGroup) =>
  Number(a.title === OTHER_GROUP) - Number(b.title === OTHER_GROUP) ||
  byOrderThenName({ name: a.title, order: a.order }, { name: b.title, order: b.order });
