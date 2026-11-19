import { findImageUrl } from '../wiki/game-image/game-image.helpers.ts';
import { getEntities, getFactions } from '../wiki/wiki.data.ts';
import { toSide, toSideEntities } from './catalog/catalog.helpers.ts';
import { toNameKinds } from './catalog/catalog.names.ts';
import type { Side, SideCatalog } from './build-order.types.ts';

export const getSides = async (): Promise<Side[]> => {
  const factions = await getFactions();
  return factions.map((faction) => toSide(faction, factions, findImageUrl(faction.id)));
};

export const getSideCatalog = async (sideId: string): Promise<SideCatalog | undefined> => {
  const side = (await getSides()).find(({ id }) => id === sideId);
  if (!side) return undefined;
  const entities = await getEntities();
  return { side, entities: toSideEntities(side, entities, findImageUrl), nameKinds: toNameKinds(side.id, entities) };
};
