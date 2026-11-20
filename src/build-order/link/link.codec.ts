import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { BASE_UID, REPLICATE_UID } from '../build-order.types.ts';
import { BASE_INDEX, LINK_PREFIX, MAX_STEPS, REPLICATE_INDEX } from './link.constants.ts';
import { fromBase64Url, toBase64Url } from './link.base64.ts';
import { toEntityRef } from './link.refs.ts';
import type { Build, BuildLink, BuildLinkQueued, BuildLinkTimed, DecodeResult, KnownSides } from '../build-order.types.ts';

// `[ref, at]` or `[ref, at, producerIndex]`; `[ref]`, `[ref, producerIndex]`, `[ref, producerIndex | null, at]` or, for a
// loop, `[ref, producerIndex | null, at | null, 1]`.
type TimedTuple = [string, number, number?];
type QueuedTuple = [string, (number | null)?, (number | null)?, 1?];
// Data version, faction, mercenary ('' = none), hero ref ('' = none), title, author, timed, queued.
type LinkTuple = [string, string, string, string, string, string, TimedTuple[], QueuedTuple[]];

// Always stamped with the current data version: a build opened then shared again takes it. A producer is written as
// its position in the encoded `timed` (-1 = base, -2 = Replicate, US-009), so the link needs no uid.
export const toBuildLink = (build: Build): BuildLink => {
  const timed = build.timed.flatMap((step) => {
    const ref = toEntityRef(step.entityId, build.factionId);
    return ref === null ? [] : [{ step, ref }];
  });
  const indexByUid = new Map(timed.map(({ step }, index) => [step.uid, index]));
  const toProducerIndex = (uid: string | undefined) => {
    if (uid === undefined) return null;
    if (uid === BASE_UID) return BASE_INDEX;
    return uid === REPLICATE_UID ? REPLICATE_INDEX : (indexByUid.get(uid) ?? null);
  };
  return {
    dataVersion: STEAM_BUILD_ID,
    factionId: build.factionId,
    mercenaryId: build.mercenaryId,
    heroRef: build.heroId === null ? null : toEntityRef(build.heroId, build.factionId),
    title: build.title,
    author: build.author,
    timed: timed.map(({ step, ref }) => ({ ref, at: step.at, producerIndex: toProducerIndex(step.producerUid) })),
    queued: build.queued.flatMap((step) => {
      const ref = toEntityRef(step.entityId, build.factionId);
      if (ref === null) return [];
      const repeat = step.repeat && { repeat: true as const };
      return [{ ref, producerIndex: toProducerIndex(step.producerUid), at: step.at ?? null, ...repeat }];
    }),
  };
};

export const encodeBuild = (build: Build) => encodeBuildLink(toBuildLink(build));

// No catalog needed.
export const encodeBuildLink = (link: BuildLink) => {
  const tuple = [
    link.dataVersion,
    link.factionId,
    link.mercenaryId ?? '',
    link.heroRef ?? '',
    link.title,
    link.author,
    link.timed.map(toTimedTuple),
    link.queued.map(toQueuedTuple),
  ];
  return `${LINK_PREFIX}${toBase64Url(JSON.stringify(tuple))}`;
};

// Never throws: any other prefix (a `2.` link included), arity or type makes the whole link invalid.
export const decodeBuildCode = (code: string, sides: KnownSides): DecodeResult => {
  if (!code.startsWith(LINK_PREFIX)) return INVALID;
  const json = fromBase64Url(code.slice(LINK_PREFIX.length));
  const tuple = json === null ? undefined : parseJson(json);
  if (!isLinkTuple(tuple, sides)) return INVALID;
  const [dataVersion, factionId, mercenaryId, heroRef, title, author, timed, queued] = tuple;
  return {
    status: 'ok',
    link: {
      dataVersion,
      factionId,
      mercenaryId: mercenaryId === '' ? null : mercenaryId,
      heroRef: heroRef === '' ? null : heroRef,
      title,
      author,
      timed: timed.map(([ref, at, producerIndex = null]) => ({ ref, at, producerIndex })),
      queued: queued.map(([ref, producerIndex = null, at = null, repeat]) => ({
        ref,
        producerIndex,
        at,
        ...(repeat === 1 && { repeat: true as const }),
      })),
    },
  };
};

const INVALID: DecodeResult = { status: 'invalid' };
const TUPLE_LENGTH = 8;

const toTimedTuple = ({ ref, at, producerIndex }: BuildLinkTimed): TimedTuple =>
  producerIndex === null ? [ref, at] : [ref, at, producerIndex];

// The trailing null values are left out.
const toQueuedTuple = ({ ref, producerIndex, at, repeat }: BuildLinkQueued): QueuedTuple => {
  if (repeat) return [ref, producerIndex, at, 1];
  if (at !== null) return [ref, producerIndex, at];
  return producerIndex === null ? [ref] : [ref, producerIndex];
};

const isLinkTuple = (tuple: unknown, sides: KnownSides): tuple is LinkTuple => {
  if (!Array.isArray(tuple) || tuple.length !== TUPLE_LENGTH) return false;
  const [dataVersion, factionId, mercenaryId, heroRef, title, author, timed, queued] = tuple;
  return (
    typeof dataVersion === 'string' &&
    typeof factionId === 'string' &&
    sides.factionIds.includes(factionId) &&
    typeof mercenaryId === 'string' &&
    (mercenaryId === '' || sides.mercenaryIds.includes(mercenaryId)) &&
    typeof heroRef === 'string' &&
    typeof title === 'string' &&
    typeof author === 'string' &&
    Array.isArray(timed) &&
    Array.isArray(queued) &&
    timed.length + queued.length <= MAX_STEPS &&
    timed.every(isTimedTuple) &&
    queued.every(isQueuedTuple)
  );
};

const isTimedTuple = (value: unknown): value is TimedTuple =>
  Array.isArray(value) &&
  (value.length === 2 || value.length === 3) &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'number' &&
  (value.length === 2 || typeof value[2] === 'number');

const isQueuedTuple = (value: unknown): value is QueuedTuple =>
  Array.isArray(value) &&
  value.length >= 1 &&
  value.length <= 4 &&
  typeof value[0] === 'string' &&
  (value.length < 2 || value[1] === null || typeof value[1] === 'number') &&
  (value.length < 3 || typeof value[2] === 'number' || (value[2] === null && value.length === 4)) &&
  (value.length < 4 || value[3] === 1);

const parseJson = (json: string): unknown => {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
};
