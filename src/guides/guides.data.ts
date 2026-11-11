import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { getEntities, getFactionMap, getPatchNotes } from '../wiki/wiki.data.ts';
import type { Entity, Faction } from '../wiki/wiki.types.ts';
import { extractBuildOrder, parseBuildOrder, resolveBuildOrder } from './guide-page/build-order/build-order.helpers.ts';
import { MAIN_FACTION_ORDER } from './guides.constants.ts';
import {
  assertGeneralGuideFields,
  byAddedThenTitle,
  getPatchStatus,
  latestPatchNumber,
  normalizeName,
  resolveTalents,
  toMatchupTags,
} from './guides.helpers.ts';
import type { BuildOrderField, BuildOrderGuide, Guide, GuideBase } from './guides.types.ts';

type GuideEntry = CollectionEntry<'guides'>;
type GuideData = GuideEntry['data'];

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
    throw new Error(`data/guides/${entry.id}.md${detail.startsWith('bo line') ? ',' : ':'} ${detail}`);
  }
};

const toGuide = (entry: GuideEntry, context: GuideContext): Guide => {
  const { title, author, description, patch, added } = entry.data;
  if (!context.patchLabels.includes(`Update #${patch}`)) {
    throw new Error(`patch ${patch} is not a known patch (latest: ${context.latestPatch}).`);
  }
  const base: GuideBase = {
    slug: entry.id,
    title,
    author,
    description,
    patch,
    added: added.toISOString().slice(0, 10),
    patchStatus: getPatchStatus(patch, context.latestPatch),
    entry,
  };
  const source = extractBuildOrder(entry.body ?? '');
  if (source === undefined) {
    assertGeneralGuideFields(entry.data);
    return { ...base, type: 'guide' };
  }
  return toBuildOrderGuide(base, entry.data, source, context);
};

const toBuildOrderGuide = (base: GuideBase, data: GuideData, source: string, context: GuideContext): BuildOrderGuide => {
  const faction = findFaction(requireField(data, 'faction'), context);
  const mercenary = findFaction(requireField(data, 'mercenary'), context);
  const vs = requireField(data, 'vs');
  if (Object.keys(vs).length === 0) throw new Error('vs is required in a build order.');
  const hero = requireField(data, 'hero');
  const scope = context.entities.filter(
    (entity) => (entity.faction === faction.id || entity.faction === mercenary.id) && entity.kind !== 'talent',
  );
  const label = `${faction.id} + ${mercenary.id}`;
  const talentsOf = (factionId: string) =>
    context.entities.filter((entity) => entity.faction === factionId && entity.kind === 'talent');
  return {
    ...base,
    type: 'build-order',
    style: requireField(data, 'style'),
    faction,
    mercenary,
    hero: findByName(hero, scope, ['hero'], `hero: "${hero}" is not a hero of ${label}.`),
    talents: resolveTalents(requireField(data, 'talents'), talentsOf(faction.id), talentsOf(mercenary.id)),
    army: requireField(data, 'army').map((name) =>
      findByName(name, scope, ['unit', 'hero'], `army: "${name}" is not a unit or hero of ${label}.`),
    ),
    vs: MAIN_FACTION_ORDER.flatMap((key) => {
      const rating = vs[key];
      return rating === undefined ? [] : [{ faction: findFaction(key, context), rating }];
    }),
    matchupTags: toMatchupTags(faction.id, Object.keys(vs)),
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    buildOrder: { ...resolveBuildOrder(parseBuildOrder(source), { entities: scope, label }), source },
  };
};

const requireField = <Field extends BuildOrderField>(data: GuideData, field: Field) => {
  const value = data[field];
  if (value === undefined) throw new Error(`${field} is required in a build order.`);
  return value;
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
