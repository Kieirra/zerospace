import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { getEntities, getFactionMap, getPatchNotes } from '../wiki/wiki.data.ts';
import type { Entity, Faction } from '../wiki/wiki.types.ts';
import { extractBuildOrders, resolveBuildOrders } from './guide-page/build-order/build-order.helpers.ts';
import { MAIN_FACTION_ORDER } from './guides.constants.ts';
import {
  assertFieldDependencies,
  byAddedThenTitle,
  getPatchStatus,
  latestPatchNumber,
  normalizeName,
  resolveTalents,
  toMatchupTags,
} from './guides.helpers.ts';
import type { Guide } from './guides.types.ts';

type GuideEntry = CollectionEntry<'guides'>;

let guides: Promise<Guide[]> | undefined;

// Guides validated and resolved once for all the pages; an invalid guide fails the build.
export const getGuides = () => (guides ??= loadGuides());

export const getGuidePaths = async () =>
  (await getGuides()).map((guide) => ({ params: { slug: guide.slug }, props: { guide } }));

interface GuideContext {
  entities: Entity[];
  factions: Map<string, Faction>;
  patchLabels: string[];
  latestPatch: number;
}

const loadGuides = async () => {
  const [entries, entities, factions, patchNotes] = await Promise.all([
    getCollection('guides'),
    getEntities(),
    getFactionMap(),
    getPatchNotes(),
  ]);
  const patchLabels = patchNotes.map(({ label }) => label);
  const context = { entities, factions, patchLabels, latestPatch: latestPatchNumber(patchLabels) };
  return entries.map((entry) => toGuideOrFail(entry, context)).sort(byAddedThenTitle);
};

const toGuideOrFail = (entry: GuideEntry, context: GuideContext) => {
  try {
    return toGuide(entry, context);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`data/guides/${entry.id}.md${/^bo (line|block)/.test(detail) ? ',' : ':'} ${detail}`);
  }
};

const toGuide = (entry: GuideEntry, context: GuideContext): Guide => {
  const { data } = entry;
  if (!context.patchLabels.includes(`Update #${data.patch}`)) {
    throw new Error(`patch ${data.patch} is not a known patch (latest: ${context.latestPatch}).`);
  }
  const sources = extractBuildOrders(entry.body ?? '');
  assertFieldDependencies(data, sources.main !== undefined || sources.branches.length > 0);
  const faction = data.faction === undefined ? undefined : findFaction(data.faction, context);
  const mercenary = data.mercenary === undefined ? undefined : findFaction(data.mercenary, context);
  const scopeIds: string[] = [data.faction, data.mercenary].filter((id) => id !== undefined);
  const scope = context.entities.filter((entity) => scopeIds.includes(entity.faction) && entity.kind !== 'talent');
  const label = scopeIds.join(' + ');
  const { main, branches } = resolveBuildOrders(sources, { entities: scope, label });
  const talentsOf = (factionId: string) =>
    context.entities.filter((entity) => entity.faction === factionId && entity.kind === 'talent');
  const { hero, talents, army, vs } = data;
  return {
    slug: entry.id,
    title: data.title,
    author: data.author,
    description: data.description,
    patch: data.patch,
    added: data.added.toISOString().slice(0, 10),
    patchStatus: getPatchStatus(data.patch, context.latestPatch),
    entry,
    style: data.style,
    faction,
    mercenary,
    hero: hero === undefined ? undefined : findByName(hero, scope, ['hero'], `hero: "${hero}" is not a hero of ${label}.`),
    talents: talents && faction && mercenary ? resolveTalents(talents, talentsOf(faction.id), talentsOf(mercenary.id)) : [],
    army: (army ?? []).map((name) =>
      findByName(name, scope, ['unit', 'hero'], `army: "${name}" is not a unit or hero of ${label}.`),
    ),
    vs: MAIN_FACTION_ORDER.flatMap((key) => {
      const rating = vs?.[key];
      return rating === undefined ? [] : [{ faction: findFaction(key, context), rating }];
    }),
    matchupTags: faction && vs ? toMatchupTags(faction.id, Object.keys(vs)) : [],
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    mainBuildOrder: main,
    branches,
  };
};

const findFaction = (id: string, { factions }: GuideContext) => {
  const faction = factions.get(id);
  if (!faction) throw new Error(`faction ${id} is missing from the wiki data.`);
  return faction;
};

const findByName = (name: string, scope: Entity[], kinds: Entity['kind'][], message: string) => {
  const entity = scope.find(
    (candidate) => kinds.includes(candidate.kind) && normalizeName(candidate.name) === normalizeName(name),
  );
  if (!entity) throw new Error(message);
  return entity;
};
