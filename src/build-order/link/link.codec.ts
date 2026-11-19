import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { BASE_UID } from '../build-order.types.ts';
import { LINK_PREFIX, MAX_STEPS } from './link.constants.ts';
import { fromBase64Url, toBase64Url } from './link.base64.ts';
import { toEntityRef } from './link.refs.ts';
import type { Build, BuildLink, BuildLinkQueued, BuildLinkTimed, DecodeResult, KnownSides } from '../build-order.types.ts';

// `[ref, at]` or `[ref, at, producerIndex]`; `[ref]`, `[ref, producerIndex]` or `[ref, producerIndex | null, at]`.
type TimedTuple = [string, number, number?];
type QueuedTuple = [string, (number | null)?, number?];
// Data version, faction, mercenary ('' = none), hero ref ('' = none), title, author, timed, queued.
type LinkTuple = [string, string, string, string, string, string, TimedTuple[], QueuedTuple[]];

// Always stamped with the current data version: a build opened then shared again takes it. A producer is written as
// its position in the encoded `timed` (-1 = base), so the link needs no uid.
export const toBuildLink = (build: Build): BuildLink => {
  const timed = build.timed.flatMap((step) => {
    const ref = toEntityRef(step.entityId, build.factionId);
    return ref === null ? [] : [{ step, ref }];
  });
  const indexByUid = new Map(timed.map(({ step }, index) => [step.uid, index]));
  const toProducerIndex = (uid: string | undefined) => (uid === undefined ? null : uid === BASE_UID ? -1 : (indexByUid.get(uid) ?? null));
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
      return ref === null ? [] : [{ ref, producerIndex: toProducerIndex(step.producerUid), at: step.at ?? null }];
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
      queued: queued.map(([ref, producerIndex = null, at = null]) => ({ ref, producerIndex, at })),
    },
  };
};

const INVALID: DecodeResult = { status: 'invalid' };
const TUPLE_LENGTH = 8;

const toTimedTuple = ({ ref, at, producerIndex }: BuildLinkTimed): TimedTuple =>
  producerIndex === null ? [ref, at] : [ref, at, producerIndex];

// The trailing null values are left out.
const toQueuedTuple = ({ ref, producerIndex, at }: BuildLinkQueued): QueuedTuple => {
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
  value.length <= 3 &&
  typeof value[0] === 'string' &&
  (value.length < 2 || value[1] === null || typeof value[1] === 'number') &&
  (value.length < 3 || typeof value[2] === 'number');

const parseJson = (json: string): unknown => {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
};
