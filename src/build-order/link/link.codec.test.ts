import { describe, expect, it } from 'vitest';
import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { toBase64Url } from './link.base64.ts';
import { decodeBuildCode, encodeBuildLink, toBuildLink } from './link.codec.ts';
import { parseEntityRef, toEntityRef } from './link.refs.ts';
import type { Build, BuildLink, KnownSides } from '../build-order.types.ts';

const SIDES: KnownSides = { factionIds: ['protectorate', 'the-legion'], mercenaryIds: ['marran'] };

// Example of the US, before base64url.
const EXAMPLE_JSON =
  '["26399317","protectorate","marran","h.prefect-aster","Sentinel push","Mazar",[["b.supply-platform",40],["b.barracks",55]],[["u.prospector",-1],["u.sentinel"],["u.sentinel",1]]]';
const EXAMPLE_LINK: BuildLink = {
  dataVersion: '26399317',
  factionId: 'protectorate',
  mercenaryId: 'marran',
  heroRef: 'h.prefect-aster',
  title: 'Sentinel push',
  author: 'Mazar',
  timed: [
    { ref: 'b.supply-platform', at: 40, producerIndex: null },
    { ref: 'b.barracks', at: 55, producerIndex: null },
  ],
  queued: [
    { ref: 'u.prospector', producerIndex: -1, at: null },
    { ref: 'u.sentinel', producerIndex: null, at: null },
    { ref: 'u.sentinel', producerIndex: 1, at: null },
  ],
};

const toCode = (tuple: unknown) => `3.${toBase64Url(JSON.stringify(tuple))}`;
const withTuple = (changes: Record<number, unknown>) => toCode(Object.assign(JSON.parse(EXAMPLE_JSON), changes));

describe('Link v3: format', () => {
  it('should encode the example of the US to its exact JSON tuple', () => {
    expect(encodeBuildLink(EXAMPLE_LINK)).toBe(`3.${toBase64Url(EXAMPLE_JSON)}`);
  });

  it('should decode the example of the US to the same link', () => {
    expect(decodeBuildCode(`3.${toBase64Url(EXAMPLE_JSON)}`, SIDES)).toEqual({ status: 'ok', link: EXAMPLE_LINK });
  });

  it('should write a producer as its position in the encoded timed steps, the base as -1, and a recruit time', () => {
    const build: Build = {
      version: 3,
      dataVersion: 'old',
      factionId: 'protectorate',
      mercenaryId: 'marran',
      heroId: null,
      title: '',
      author: '',
      timed: [
        { uid: 's1', entityId: 'protectorate/building/barracks', at: 30 },
        { uid: 's2', entityId: 'marran/building/marran-bulwark', at: 60 },
        { uid: 's3', entityId: 'protectorate/upgrade/turret-platform', at: 90, producerUid: 's1' },
      ],
      queued: [
        { uid: 's4', entityId: 'protectorate/unit/prospector', producerUid: 'base' },
        { uid: 's5', entityId: 'marran/unit/marran-pulse-skimmer', producerUid: 's2', at: 120 },
        { uid: 's6', entityId: 'protectorate/unit/sentinel', at: 5 },
      ],
    };

    expect(toBuildLink(build)).toMatchObject({
      dataVersion: STEAM_BUILD_ID,
      timed: [
        { ref: 'b.barracks', at: 30, producerIndex: null },
        { ref: 'mb.marran-bulwark', at: 60, producerIndex: null },
        { ref: 'r.turret-platform', at: 90, producerIndex: 0 },
      ],
      queued: [
        { ref: 'u.prospector', producerIndex: -1, at: null },
        { ref: 'mu.marran-pulse-skimmer', producerIndex: 1, at: 120 },
        { ref: 'u.sentinel', producerIndex: null, at: 5 },
      ],
    });
  });

  it('should leave out the trailing null values of a queued step', () => {
    const link = { ...EXAMPLE_LINK, queued: [{ ref: 'u.sentinel', producerIndex: null, at: 30 }] };
    const json = atob(encodeBuildLink(link).slice(2).replace(/-/g, '+').replace(/_/g, '/'));

    expect(JSON.parse(json)[7]).toEqual([['u.sentinel', null, 30]]);
  });

  it('should read back a title with accents and emoji', () => {
    const link = { ...EXAMPLE_LINK, title: 'Poussée 🚀', author: 'Zoë' };

    expect(decodeBuildCode(encodeBuildLink(link), SIDES)).toEqual({ status: 'ok', link });
  });
});

describe('Link v3: invalid codes', () => {
  it.each([
    ['a v2 link', `2.${toBase64Url(EXAMPLE_JSON)}`],
    ['broken base64', '3.abc$$'],
    ['no version', 'WyJ4Il0'],
    ['empty payload', '3.'],
    ['cut in the middle', encodeBuildLink(EXAMPLE_LINK).slice(0, 60)],
    ['not JSON', `3.${toBase64Url('not json')}`],
    ['not an array', toCode({ a: 1 })],
    ['7 elements', toCode(JSON.parse(EXAMPLE_JSON).slice(0, 7))],
    ['9 elements', toCode([...JSON.parse(EXAMPLE_JSON), []])],
  ])('should be invalid with %s', (_, code) => {
    expect(decodeBuildCode(code, SIDES)).toEqual({ status: 'invalid' });
  });

  it.each([
    ['an unknown faction', { 1: 'atlantis' }],
    ['an unknown mercenary', { 2: 'pirates' }],
    ['a numeric data version', { 0: 26399317 }],
    ['a null title', { 4: null }],
    ['timed steps not in a list', { 6: 'b.barracks' }],
    ['a timed step without time', { 6: [['b.barracks']] }],
    ['a timed time as text', { 6: [['b.barracks', '30']] }],
    ['a timed step with 4 values', { 6: [['b.barracks', 30, 0, 1]] }],
    ['a queued step without ref', { 7: [[]] }],
    ['a queued producer as text', { 7: [['u.sentinel', '1']] }],
    ['a queued time as null', { 7: [['u.sentinel', null, null]] }],
    ['201 steps', { 6: [], 7: Array.from({ length: 201 }, () => ['u.sentinel']) }],
    ['201 steps over both lists', { 6: Array.from({ length: 101 }, () => ['b.barracks', 0]), 7: Array.from({ length: 100 }, () => ['u.sentinel']) }],
  ])('should be invalid with %s', (_, changes) => {
    expect(decodeBuildCode(withTuple(changes), SIDES)).toEqual({ status: 'invalid' });
  });

  it('should accept 200 steps', () => {
    const changes = { 6: Array.from({ length: 100 }, () => ['b.barracks', 0]), 7: Array.from({ length: 100 }, () => ['u.sentinel']) };

    expect(decodeBuildCode(withTuple(changes), SIDES).status).toBe('ok');
  });
});

describe('Link v3: entity refs', () => {
  it('should write a short ref, prefixed for the mercenary', () => {
    expect(toEntityRef('protectorate/unit/sentinel', 'protectorate')).toBe('u.sentinel');
    expect(toEntityRef('marran/building/marran-bulwark', 'protectorate')).toBe('mb.marran-bulwark');
    expect(toEntityRef('protectorate/upgrade/jetpack', 'protectorate')).toBe('r.jetpack');
    expect(toEntityRef('odd-id', 'protectorate')).toBeNull();
  });

  it('should read a ref back, and not a mercenary ref without mercenary', () => {
    expect(parseEntityRef('mu.marran-pulse-skimmer', 'protectorate', 'marran')).toBe('marran/unit/marran-pulse-skimmer');
    expect(parseEntityRef('h.prefect-aster', 'protectorate', null)).toBe('protectorate/hero/prefect-aster');
    expect(parseEntityRef('mu.marran-pulse-skimmer', 'protectorate', null)).toBeNull();
    expect(parseEntityRef('x.nothing', 'protectorate', null)).toBeNull();
  });
});
