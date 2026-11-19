import { describe, expect, it } from 'vitest';
import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { getCatalog } from '../engine/engine.wiki-fixtures.ts';
import { decodeBuildCode, encodeBuild } from './link.codec.ts';
import { resolveBuildLink } from './link.resolve.ts';
import type { Build, BuildLink, KnownSides } from '../build-order.types.ts';

const SIDES: KnownSides = { factionIds: ['protectorate', 'the-legion'], mercenaryIds: ['marran'] };
const PROTECTORATE = getCatalog('protectorate');
const MARRAN = getCatalog('marran');

const BUILD: Build = {
  version: 3,
  dataVersion: STEAM_BUILD_ID,
  factionId: 'protectorate',
  mercenaryId: 'marran',
  heroId: 'protectorate/hero/prefect-aster',
  title: 'Sentinel push',
  author: 'Mazar',
  timed: [
    { uid: 's1', entityId: 'protectorate/building/supply-platform', at: 20 },
    { uid: 's2', entityId: 'protectorate/building/barracks', at: 40 },
    { uid: 's3', entityId: 'protectorate/building/research-lab', at: 80 },
    { uid: 's4', entityId: 'protectorate/upgrade/turret-platform', at: 90, producerUid: 's1' },
    { uid: 's5', entityId: 'marran/building/marran-bulwark', at: 100 },
  ],
  queued: [
    { uid: 's6', entityId: 'protectorate/unit/prospector', producerUid: 'base' },
    { uid: 's7', entityId: 'protectorate/unit/sentinel', producerUid: 's2' },
    { uid: 's8', entityId: 'protectorate/unit/sentinel' },
    { uid: 's9', entityId: 'marran/unit/marran-pulse-skimmer', at: 150 },
  ],
};

const roundTrip = (build: Build) => {
  const decoded = decodeBuildCode(encodeBuild(build), SIDES);
  if (decoded.status !== 'ok') throw new Error('invalid link');
  return resolveBuildLink(decoded.link, PROTECTORATE, MARRAN);
};

const toLink = (fields: Partial<BuildLink>): BuildLink => ({
  dataVersion: STEAM_BUILD_ID,
  factionId: 'protectorate',
  mercenaryId: 'marran',
  heroRef: 'h.prefect-aster',
  title: '',
  author: '',
  timed: [],
  queued: [],
  ...fields,
});

const resolve = (fields: Partial<BuildLink>) => resolveBuildLink(toLink(fields), PROTECTORATE, MARRAN);

describe('Link v3: round trip', () => {
  it('should give back the same build, pins and recruit time included', () => {
    expect(roundTrip(BUILD)).toEqual({ build: BUILD, isDataVersionChanged: false, linkDataVersion: STEAM_BUILD_ID });
  });

  it('should number the steps s1 to sN, the timed ones first, and sort them by time', () => {
    const { build } = resolve({
      timed: [
        { ref: 'b.barracks', at: 50, producerIndex: null },
        { ref: 'b.supply-platform', at: 10, producerIndex: null },
      ],
      queued: [{ ref: 'u.prospector', producerIndex: null, at: null }],
    });

    expect(build.timed).toEqual([
      { uid: 's2', entityId: 'protectorate/building/supply-platform', at: 10 },
      { uid: 's1', entityId: 'protectorate/building/barracks', at: 50 },
    ]);
    expect(build.queued).toEqual([{ uid: 's3', entityId: 'protectorate/unit/prospector' }]);
  });
});

describe('Link v3: tolerant resolution', () => {
  it('should hold a time to whole seconds between 0 and the end', () => {
    const { build } = resolve({
      timed: [
        { ref: 'b.supply-platform', at: -5, producerIndex: null },
        { ref: 'b.barracks', at: 12.6, producerIndex: null },
        { ref: 'b.research-lab', at: 99_999, producerIndex: null },
      ],
    });

    expect(build.timed.map(({ at }) => at)).toEqual([0, 13, 1800]);
  });

  it('should make Auto a producer out of range or naming a step that is not a building', () => {
    const { build } = resolve({
      timed: [
        { ref: 'b.supply-platform', at: 0, producerIndex: null },
        { ref: 'r.hyperdense-rounds', at: 10, producerIndex: null },
      ],
      queued: [
        { ref: 'u.prospector', producerIndex: 7, at: null },
        { ref: 'u.prospector', producerIndex: 1, at: null },
        { ref: 'u.prospector', producerIndex: 0.5, at: null },
      ],
    });

    expect(build.queued.map(({ producerUid }) => producerUid)).toEqual([undefined, undefined, undefined]);
  });

  it('should drop the unknown refs, the steps in the wrong list and the units no building can make', () => {
    const resolved = resolve({
      timed: [
        { ref: 'b.nowhere', at: 0, producerIndex: null },
        { ref: 'u.prospector', at: 0, producerIndex: null },
      ],
      queued: [
        { ref: 'u.sentinel', producerIndex: null, at: null },
        { ref: 'u.prospector', producerIndex: null, at: null },
      ],
    });

    expect(resolved.build.timed).toEqual([]);
    expect(resolved.build.queued.map(({ entityId }) => entityId)).toEqual(['protectorate/unit/prospector']);
  });

  it('should keep the time of every queued step, a unit as a recruit (Kieirra 2026-11-19)', () => {
    const { build } = resolve({
      timed: [{ ref: 'mb.marran-bulwark', at: 0, producerIndex: null }],
      queued: [
        { ref: 'u.prospector', producerIndex: null, at: 30 },
        { ref: 'mu.marran-pulse-skimmer', producerIndex: null, at: 30 },
      ],
    });

    expect(build.queued.map(({ at }) => at)).toEqual([30, 30]);
  });

  it('should keep the loop of a unit and its pin, and drop the loop of a harvester', () => {
    const { build } = resolve({
      timed: [{ ref: 'b.barracks', at: 0, producerIndex: null }],
      queued: [
        { ref: 'u.sentinel', producerIndex: 0, at: null, repeat: true },
        { ref: 'u.prospector', producerIndex: -1, at: null, repeat: true },
      ],
    });

    expect(build.queued).toEqual([
      { uid: 's2', entityId: 'protectorate/unit/sentinel', producerUid: 's1', repeat: true },
      { uid: 's3', entityId: 'protectorate/unit/prospector', producerUid: 'base' },
    ]);
  });

  it('should replace a hero outside the pool by the default one and flag an older data version', () => {
    const resolved = resolve({ heroRef: 'h.nobody', dataVersion: 'old' });

    expect(resolved.build.heroId).toBe('protectorate/hero/prefect-aster');
    expect(resolved).toMatchObject({ isDataVersionChanged: true, linkDataVersion: 'old' });
  });
});
