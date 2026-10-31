import { OTHER_GROUP } from '../wiki.constants.ts';
import { byName } from '../wiki.helpers.ts';
import type { Entity } from '../wiki.types.ts';

export interface EntityGroup {
  title: string;
  entities: Entity[];
}

export const groupEntities = (
  entities: Entity[],
  getGroupId: (entity: Entity) => string | undefined,
  names: Map<string, Entity>,
) => {
  const groups = new Map<string, Entity[]>();
  for (const entity of entities) {
    const groupId = getGroupId(entity);
    const title = groupId ? (names.get(groupId)?.name ?? groupId) : OTHER_GROUP;
    groups.set(title, [...(groups.get(title) ?? []), entity]);
  }
  return [...groups]
    .map(([title, groupEntities]): EntityGroup => ({ title, entities: groupEntities }))
    .sort(byTitleWithOtherLast);
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

const byTitleWithOtherLast = (a: EntityGroup, b: EntityGroup) =>
  Number(a.title === OTHER_GROUP) - Number(b.title === OTHER_GROUP) || a.title.localeCompare(b.title);
