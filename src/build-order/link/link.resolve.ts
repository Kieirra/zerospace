import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { MAX_AUTHOR_LENGTH, MAX_TITLE_LENGTH } from '../build-order.constants.ts';
import { isBuildingCategory, toCatalogMap, toStepKind } from '../build-order.helpers.ts';
import { BASE_UID, REPLICATE_UID } from '../build-order.types.ts';
import { dropOrphanUnits } from '../build-editor/build-editor.queued.ts';
import { clampAt, sortTimed } from '../build-editor/build-editor.timed.ts';
import { getDefaultHeroId, getHeroPool } from '../catalog/catalog.helpers.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { BASE_INDEX, REPLICATE_INDEX } from './link.constants.ts';
import { parseEntityRef } from './link.refs.ts';
import type { BuildLink, QueuedStep, ResolvedBuild, SideCatalog, TimedStep } from '../build-order.types.ts';

// Tolerant: unknown steps, and units no building of the build can make, are dropped without a message; every other
// odd value falls back to a valid one (a producer out of range or not a building is Auto, a time is held to whole seconds, a loop
// on anything but a unit is dropped). A merge has no producer; a Replicate copy of a unit without energy cost is dropped (US-009).
export const resolveBuildLink = (link: BuildLink, factionCatalog: SideCatalog, mercenaryCatalog: SideCatalog | null): ResolvedBuild => {
  const catalog = toCatalogMap([...factionCatalog.entities, ...(mercenaryCatalog?.entities ?? [])]);
  const toEntity = (ref: string, kind: 'timed' | 'queued') => {
    const entityId = parseEntityRef(ref, link.factionId, link.mercenaryId);
    const entity = entityId === null ? undefined : catalog.get(entityId);
    return entity && toStepKind(entity) === kind ? entity : undefined;
  };
  const timedEntities = link.timed.map(({ ref }) => toEntity(ref, 'timed'));
  const queuedEntities = link.queued.map(({ ref }) => toEntity(ref, 'queued'));
  const uidByLinkIndex = new Map<number, string>();
  let count = 0;
  const nextUid = () => {
    count += 1;
    return `s${count}`;
  };
  timedEntities.forEach((entity, index) => entity && uidByLinkIndex.set(index, nextUid()));
  const toProducerUid = (producerIndex: number | null) => {
    if (producerIndex === null) return undefined;
    if (producerIndex === BASE_INDEX) return BASE_UID;
    const entity = timedEntities[producerIndex];
    return entity && isBuildingCategory(entity) ? uidByLinkIndex.get(producerIndex) : undefined;
  };
  const timed = link.timed.flatMap((step, index): TimedStep[] => {
    const uid = uidByLinkIndex.get(index);
    const entity = timedEntities[index];
    if (uid === undefined || !entity) return [];
    const producerUid = entity.category === 'transformation' ? toProducerUid(step.producerIndex) : undefined;
    return [{ uid, entityId: entity.id, at: clampAt(step.at), ...(producerUid === undefined ? {} : { producerUid }) }];
  });
  const queued = link.queued.flatMap((step, index): QueuedStep[] => {
    const entity = queuedEntities[index];
    const isCopy = step.producerIndex === REPLICATE_INDEX;
    if (!entity || (isCopy && entity.replicateEnergy === undefined)) return [];
    const producerUid = isCopy ? REPLICATE_UID : entity.category === 'merge' ? undefined : toProducerUid(step.producerIndex);
    const at = step.at === null ? undefined : clampAt(step.at);
    // A loop is a unit's only: a harvester, an Altar hero, a recruit, a merge or a copy is made once.
    const repeat = step.repeat && entity.category === 'unit' && !isCopy;
    return [
      {
        uid: nextUid(),
        entityId: entity.id,
        ...(producerUid === undefined ? {} : { producerUid }),
        ...(at === undefined ? {} : { at }),
        ...(repeat && { repeat: true as const }),
      },
    ];
  });
  const build = dropOrphanUnits(
    {
      version: 3,
      dataVersion: STEAM_BUILD_ID,
      factionId: link.factionId,
      mercenaryId: link.mercenaryId,
      heroId: resolveHeroId(link, factionCatalog, mercenaryCatalog),
      title: toShortText(link.title, MAX_TITLE_LENGTH),
      author: toShortText(link.author, MAX_AUTHOR_LENGTH),
      timed: sortTimed(timed),
      queued,
    },
    catalog,
  );
  return {
    build,
    isDataVersionChanged: link.dataVersion !== STEAM_BUILD_ID,
    linkDataVersion: link.dataVersion,
  };
};

// No hero stays no hero; a hero outside the setup pool becomes the default one.
const resolveHeroId = (link: BuildLink, factionCatalog: SideCatalog, mercenaryCatalog: SideCatalog | null) => {
  if (link.heroRef === null) return null;
  const pool = getHeroPool(factionCatalog.side, mercenaryCatalog?.side ?? null, resolveRules(link.factionId));
  const heroId = parseEntityRef(link.heroRef, link.factionId, link.mercenaryId);
  return pool.some((entry) => entry.heroId === heroId) ? heroId : getDefaultHeroId(pool);
};

// Cut by graphemes (what a reader sees as one character), so a joined emoji or a flag is never split.
// Without Intl.Segmenter, cut by code points: a joined emoji may then be split, never a surrogate pair.
const toShortText = (text: string, maxLength: number) => toGraphemes(text.trim()).slice(0, maxLength).join('');

const toGraphemes = (text: string) =>
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), ({ segment }) => segment)
    : Array.from(text);
