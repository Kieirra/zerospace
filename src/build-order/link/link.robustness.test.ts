import { describe, expect, it } from 'vitest';
import { getCatalog, simulateReal } from '../engine/engine.wiki-fixtures.ts';
import { toBase64Url } from './link.base64.ts';
import { decodeBuildCode, encodeBuildLink } from './link.codec.ts';
import { readBuildCode } from './link.helpers.ts';
import { resolveBuildLink } from './link.resolve.ts';
import type { BuildLink, KnownSides } from '../build-order.types.ts';

const SIDES: KnownSides = { factionIds: ['protectorate', 'grell'], mercenaryIds: ['marran'] };
const PROTECTORATE = getCatalog('protectorate');
const MARRAN = getCatalog('marran');

const LINK: BuildLink = {
  dataVersion: '26399317',
  factionId: 'protectorate',
  mercenaryId: 'marran',
  heroRef: 'mh.hel',
  title: 'Poussée 🚀 rapide',
  author: 'Zoë 👩‍🚀',
  timed: [
    { ref: 'b.supply-platform', at: 20, producerIndex: null },
    { ref: 'b.barracks', at: 45, producerIndex: null },
    { ref: 'mb.marran-bulwark', at: 60, producerIndex: null },
  ],
  queued: [
    { ref: 'u.prospector', producerIndex: -1, at: null },
    { ref: 'mu.marran-pulse-skimmer', producerIndex: 2, at: 120 },
  ],
};
const CODE = encodeBuildLink(LINK);

const toCode = (tuple: unknown) => `3.${toBase64Url(JSON.stringify(tuple))}`;
const withSteps = (timed: unknown[], queued: unknown[] = []) =>
  toCode(['26399317', 'protectorate', 'marran', 'h.prefect-aster', 'T', 'A', timed, queued]);

// Decoding, resolving and simulating: what a page does with a link.
const openAndSimulate = (code: string) => {
  const decoded = decodeBuildCode(code, SIDES);
  if (decoded.status !== 'ok') return decoded.status;
  const { build } = resolveBuildLink(decoded.link, PROTECTORATE, MARRAN);
  simulateReal(build);
  return build;
};

describe('Link: damaged codes', () => {
  it('should never throw and stay invalid when the code is cut anywhere', () => {
    const results = Array.from({ length: CODE.length }, (_, length) => decodeBuildCode(CODE.slice(0, length), SIDES));

    expect(results.every(({ status }) => status === 'invalid')).toBe(true);
  });

  it('should never throw when a character of the code is changed', () => {
    const alphabet = 'Aa0-_$%=+/ é🚀';
    const codes = Array.from(CODE).flatMap((_, index) =>
      Array.from(alphabet, (char) => `${CODE.slice(0, index)}${char}${CODE.slice(index + 1)}`),
    );

    expect(() => codes.forEach(openAndSimulate)).not.toThrow();
    // Hundreds of simulations: about 2.5 s alone, more when the whole suite runs in parallel.
  }, 20_000);

  it.each([
    ['standard base64 padding', `${CODE}==`],
    ['a space inside', `${CODE.slice(0, 10)} ${CODE.slice(10)}`],
    ['a Discord trailing bracket', `${CODE})`],
    ['invalid UTF-8 bytes', `3.${btoa('\xff\xfe\xfd')}`],
    ['a JSON number', toCode(42)],
    ['a JSON null', toCode(null)],
    ['a 9-element tuple', toCode(['26399317', 'protectorate', '', '', '', '', [], [], 1])],
    ['a nested object as step', withSteps([{ ref: 'b.barracks', at: 0 }])],
    ['a null time', withSteps([['b.barracks', null]])],
    ['a prototype faction', toCode(['1', '__proto__', '', '', '', '', [], []])],
    ['a prototype mercenary', toCode(['1', 'protectorate', 'constructor', '', '', '', [], []])],
  ])('should be invalid with %s', (_, code) => {
    expect(decodeBuildCode(code, SIDES)).toEqual({ status: 'invalid' });
  });

  it('should be invalid with JSON nested too deep to parse', () => {
    const deep = `${'['.repeat(200_000)}${']'.repeat(200_000)}`;

    expect(decodeBuildCode(`3.${toBase64Url(deep)}`, SIDES)).toEqual({ status: 'invalid' });
  });

  it('should be invalid with a malformed percent sequence in the hash', () => {
    const code = readBuildCode(`#b=${CODE.slice(0, 20)}%E0%A4%A${CODE.slice(20)}`);

    expect(decodeBuildCode(code ?? '', SIDES)).toEqual({ status: 'invalid' });
  });

  it('should read a code whose characters were percent-encoded by a chat app', () => {
    const encoded = Array.from(CODE, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).join('');

    expect(decodeBuildCode(readBuildCode(`#b=${encoded}`) ?? '', SIDES)).toEqual({ status: 'ok', link: LINK });
  });
});

describe('Link: odd values inside a readable code', () => {
  it('should read back emoji, accents, joined emoji and lone surrogates in the title and the author', () => {
    const link = { ...LINK, title: '👨‍👩‍👧 Équipe «ß» \ud800 漢字', author: '🏳️‍🌈\u0000"\\' };

    expect(decodeBuildCode(encodeBuildLink(link), SIDES)).toEqual({ status: 'ok', link });
  });

  it('should bring an infinite or huge time back into bounds', () => {
    // JSON.stringify writes Infinity as null: the raw 1e400 is put back, as a hand-made link would hold it.
    const json = JSON.stringify(['26399317', 'protectorate', 'marran', '', '', '', [['b.barracks', null]], []]).replace('null', '1e400');
    const build = openAndSimulate(`3.${toBase64Url(json)}`);

    expect(typeof build === 'object' && build.timed[0].at).toBe(1800);
  });

  it.each([
    ['a producer on itself', [['b.barracks', 0, 0]], []],
    ['a producer on a later step', [['r.turret-platform', 0, 1], ['b.supply-platform', 5]], []],
    ['a huge producer index', [], [['u.prospector', 99999999999999999999999]]],
    ['a negative recruit time', [['mb.marran-bulwark', 0]], [['mu.marran-pulse-skimmer', null, -50]]],
    ['a prototype ref', [['b.__proto__', 0], ['b.constructor', 0]], [['mu.toString']]],
    ['a hero and a research in the wrong list', [['h.prefect-aster', 0]], [['r.hyperdense-rounds']]],
  ])('should open and simulate a link with %s without throwing', (_, timed, queued) => {
    expect(() => openAndSimulate(withSteps(timed, queued))).not.toThrow();
  });

  it('should open the longest allowed link without throwing', () => {
    const timed = Array.from({ length: 100 }, (_, index) => ['b.barracks', index * 10]);
    const queued = Array.from({ length: 100 }, (_, index) => ['u.sentinel', index]);

    expect(typeof openAndSimulate(withSteps(timed, queued))).toBe('object');
  });

  it('should simulate the heaviest allowed link in bounded time when its units never start', () => {
    // Sentinels cost Flux and nothing brings any: the simulation runs to its end.
    const timed = Array.from({ length: 100 }, () => ['b.barracks', 0]);
    const decoded = decodeBuildCode(withSteps(timed, Array.from({ length: 100 }, () => ['u.sentinel'])), SIDES);
    if (decoded.status !== 'ok') throw new Error(decoded.status);
    const { build } = resolveBuildLink(decoded.link, PROTECTORATE, MARRAN);

    const startedAt = performance.now();
    const result = simulateReal(build);
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1000);
    expect(result.samples.at(-1)?.t).toBe(1800);
  });
});
