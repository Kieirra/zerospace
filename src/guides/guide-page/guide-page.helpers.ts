import type { Entity } from '../../wiki/wiki.types.ts';
import type { Guide, ResolvedBuildOrderGroup } from '../guides.types.ts';

// Entities shown as pills on the guide page, once each.
export const collectPillEntities = ({ hero, army, mainBuildOrder, branches }: Guide) => {
  const buildOrders = mainBuildOrder ? [mainBuildOrder, ...branches] : branches;
  const entities = [
    ...(hero ? [hero] : []),
    ...army,
    ...buildOrders.flatMap(({ steps }) => steps.flatMap(({ groups }) => collectGroupEntities(groups))),
  ];
  return [...new Map(entities.map((entity) => [entity.id, entity])).values()];
};

const collectGroupEntities = (groups: ResolvedBuildOrderGroup[]): Entity[] =>
  groups.flatMap(({ items }) =>
    items.flatMap(({ entity, loop, trigger = [] }) => [
      ...(entity ? [entity] : []),
      ...(loop ? [loop] : []),
      ...collectGroupEntities(trigger),
    ]),
  );
