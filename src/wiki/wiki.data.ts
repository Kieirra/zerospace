import { getCollection } from 'astro:content';
import { TABS } from './wiki.constants.ts';
import { byName, byNewestPatch, byOrderThenName } from './wiki.helpers.ts';
import type { SearchItem } from '../shared/search/search.helpers.ts';
import { toEntityUpdates } from './entity-page/entity-updates/entity-updates.helpers.ts';
import type { EntityUpdate } from './entity-page/entity-updates/entity-updates.helpers.ts';
import type { EntityKind } from './wiki.types.ts';

let patchHistory: Promise<Map<string, EntityUpdate[]>> | undefined;

export const getFactions = async () => (await getCollection('factions')).map(({ data }) => data).sort(byName);

export const getEntities = async () => (await getCollection('entities')).map(({ data }) => data);

export const getEntityMap = async () => new Map((await getEntities()).map((entity) => [entity.id, entity]));

export const getFactionMap = async () => new Map((await getFactions()).map((faction) => [faction.id, faction]));

export const getFactionEntities = async (factionId: string, kind: EntityKind) =>
  (await getEntities()).filter((entity) => entity.faction === factionId && entity.kind === kind).sort(byOrderThenName);

export const getFactionTabs = async (factionId: string) => {
  const entities = await getEntities();
  return TABS.filter((tab) => entities.some((entity) => entity.faction === factionId && entity.kind === tab.kind));
};

export const getFactionTabPaths = async () =>
  (
    await Promise.all(
      (await getFactions()).map(async (faction) =>
        (await getFactionTabs(faction.id)).map((tab) => ({ params: { faction: faction.id, tab: tab.slug }, props: { faction, tab } })),
      ),
    )
  ).flat();

export const getEntityPaths = async () =>
  (await getEntities()).map((entity) => {
    const [faction, kind, slug] = entity.id.split('/');
    return { params: { faction, kind, slug }, props: { entity } };
  });

export const getSearchIndex = async () => {
  const factions = await getFactionMap();
  return (await getEntities()).map(({ id, name, kind, faction }): SearchItem => ({
    id,
    name,
    kind,
    faction: factions.get(faction)?.name ?? faction,
  }));
};

export const getPatchNotes = async () =>
  (await getCollection('patchNotes'))
    .map(({ data }) => data)
    .sort(byNewestPatch);

// Updates of every entity the patch notes concern, built once for all the entity pages.
export const getPatchHistory = () => (patchHistory ??= buildPatchHistory());

const buildPatchHistory = async () => {
  const patches = await getPatchNotes();
  const entityIds = new Set(
    patches.flatMap(({ sections }) => sections.flatMap(({ entries }) => entries.flatMap((entry) => entry.entityIds))),
  );
  return new Map([...entityIds].map((entityId) => [entityId, toEntityUpdates(entityId, patches)]));
};
