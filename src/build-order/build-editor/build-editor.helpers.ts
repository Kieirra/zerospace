import { formatStepCount } from '../build-order.helpers.ts';
import { getDefaultHeroId, getHeroPool } from '../catalog/catalog.helpers.ts';
import { MAX_STEPS } from '../link/link.constants.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import type { Build, BuildCatalog, BuildEntity, QueuedStep, Side, TimedStep } from '../build-order.types.ts';
import type { GameRules } from '../rules/rules.data.ts';

// Setup hero pool of a faction and mercenary, from the sides alone (no catalog needed).
export const getSidesHeroPool = (sides: Side[], factionId: string, mercenaryId: string | null) => {
  const faction = sides.find(({ id }) => id === factionId);
  const mercenary = sides.find(({ id }) => id === mercenaryId) ?? null;
  return faction ? getHeroPool(faction, mercenary, resolveRules(factionId)) : [];
};

export const toDefaultHeroId = (sides: Side[], factionId: string, mercenaryId: string | null) =>
  getDefaultHeroId(getSidesHeroPool(sides, factionId, mercenaryId));

// The current hero when still in the pool of the new sides, otherwise the default one.
export const toKeptHeroId = (sides: Side[], factionId: string, mercenaryId: string | null, heroId: string | null) => {
  const pool = getSidesHeroPool(sides, factionId, mercenaryId);
  return pool.some((entry) => entry.heroId === heroId) ? heroId : getDefaultHeroId(pool);
};

// Steps of a side, removed when the side changes.
export const countSideSteps = (build: Build, sideId: string | null) =>
  sideId === null ? 0 : toAllSteps(build).filter(({ entityId }) => isOnSide(entityId, sideId)).length;

export const isOnSide = (entityId: string, sideId: string) => entityId.startsWith(`${sideId}/`);

export const toAllSteps = (build: Pick<Build, 'timed' | 'queued'>) => [...build.timed, ...build.queued];

export const isEmptyBuild = (build: Pick<Build, 'timed' | 'queued'>) => build.timed.length + build.queued.length === 0;

// MAX_STEPS reached: nothing more can be added, the link of a longer build would no longer load.
export const isFullBuild = (build: Pick<Build, 'timed' | 'queued'>) => build.timed.length + build.queued.length >= MAX_STEPS;

// 's{highest number + 1}', then the next ones: a removed uid is never given again while undo can bring it back.
export const createStepUids = (build: Pick<Build, 'timed' | 'queued'>, count: number) => {
  const highest = Math.max(0, ...toAllSteps(build).map(({ uid }) => toUidNumber(uid)));
  return Array.from({ length: count }, (_, index) => `s${highest + index + 1}`);
};

export const toUidNumber = (uid: string) => Number(UID_PATTERN.exec(uid)?.[1] ?? 0);

const UID_PATTERN = /^s(\d+)$/;

// Rules of a step allowed once (Kieirra 2026-11-19): a research, one of an exclusive group, the copies of a mercenary
// building, a hero not picked yet and the hero slots. The reason it is refused, null when it is allowed.
export const toOnceRuleReason = (entity: BuildEntity, others: BuildEntity[], build: Pick<Build, 'heroId'>, rules: GameRules) => {
  const isSame = (other: BuildEntity) => other.id === entity.id;
  if (entity.category === 'research' && others.some(isSame)) return 'Already in the build.';
  const rival = entity.exclusiveGroup === undefined ? undefined : others.find((other) => other.exclusiveGroup === entity.exclusiveGroup);
  if (entity.category === 'research' && rival) return `${rival.name} is already in the build.`;
  if (entity.category === 'mercenary-building' && others.filter(isSame).length >= rules.mercenaryBuildingCopies.value) return 'Only one per match.';
  if (entity.category !== 'hero') return null;
  if (entity.id === build.heroId || others.some(isSame)) return 'Already picked.';
  const slots = rules.heroes.paidHeroSlots.value;
  return others.filter(({ category }) => category === 'hero').length >= slots ? `No hero slot left: ${slots + 1} heroes at most.` : null;
};

// A building takes its lane with it: the units and transformations pinned on it (Kieirra 2026-11-19). A building
// required by another one is not a lane: the other one stays and shows its missing requirement.
export const removeSteps = (build: Build, uids: string[]) => {
  const removed = toCascadeUids(build, uids);
  return {
    ...build,
    timed: build.timed.filter(({ uid }) => !removed.has(uid)),
    queued: build.queued.filter(({ uid }) => !removed.has(uid)),
  };
};

const toCascadeUids = (build: Build, uids: string[]) => {
  const removed = new Set(uids);
  const isOnRemoved = ({ producerUid }: { producerUid?: string }) => producerUid !== undefined && removed.has(producerUid);
  return new Set([...removed, ...toAllSteps(build).filter(isOnRemoved).map(({ uid }) => uid)]);
};

// '{name} removed.' for one step, '{n} steps removed.' when its lane or orphan units go with it (Kieirra 2026-11-19).
export const toRemovedText = (before: Build, after: Build | null, catalog: BuildCatalog) => {
  const kept = new Set(after ? toAllSteps(after).map(({ uid }) => uid) : []);
  const gone = toAllSteps(before).filter(({ uid }) => !kept.has(uid));
  return gone.length === 1 ? `${catalog.get(gone[0].entityId)?.displayName ?? 'Step'} removed.` : `${gone.length} steps removed.`;
};

// An absent value is left out, never written as undefined: the link and the comparisons stay clean.
export const withOptional = <S extends TimedStep | QueuedStep, K extends keyof S & ('producerUid' | 'at')>(step: S, key: K, value: S[K]): S => {
  if (step[key] === value) return step;
  if (value !== undefined) return { ...step, [key]: value };
  const rest = { ...step };
  delete rest[key];
  return rest;
};

export const toSideChangeText = (kind: 'faction' | 'mercenary', count: number, oldName: string) =>
  `Change ${kind}? ${formatStepCount(count)} from ${oldName} will be removed.`;
