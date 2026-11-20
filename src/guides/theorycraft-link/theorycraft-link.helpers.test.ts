import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toBuild } from '../../build-order/bo-plan/bo-plan.import.ts';
import { entities, getCatalog, simulateReal } from '../../build-order/engine/engine.wiki-fixtures.ts';
import { decodeBuildCode, encodeBuild } from '../../build-order/link/link.codec.ts';
import { resolveBuildLink } from '../../build-order/link/link.resolve.ts';
import { extractBuildOrders, parseBuildOrder, resolveBuildOrder, resolveBuildOrders } from '../guide-page/build-order/build-order.helpers.ts';
import { toBoPlan } from './theorycraft-link.helpers.ts';
import type { Build } from '../../build-order/build-order.types.ts';
import type { BoPlanHeader } from './theorycraft-link.helpers.ts';

const EXALTED_HEADER: BoPlanHeader = {
  factionId: 'the-legion',
  mercenaryId: 'arandi',
  heroId: 'the-legion/hero/galavax',
  title: 'Exalted Arandi',
  author: 'Kieirra',
};
const PARADOX_HEADER: BoPlanHeader = {
  factionId: 'the-xol',
  mercenaryId: 'arandi',
  heroId: 'arandi/hero/iolin',
  title: 'Paradox Opening',
  author: 'Aureil',
};

const scopeOf = ({ factionId, mercenaryId }: BoPlanHeader) => ({
  label: `${factionId} + ${mercenaryId}`,
  entities: entities.filter(({ faction, kind }) => [factionId, mercenaryId].includes(faction) && kind !== 'talent'),
});

const readMainBuildOrder = (slug: string, header: BoPlanHeader) => {
  const [, , body] = readFileSync(new URL(`../../../data/guides/${slug}.md`, import.meta.url), 'utf8').split(/^---$/m);
  const { main } = resolveBuildOrders(extractBuildOrders(body), scopeOf(header));
  if (!main) throw new Error(`${slug} has no main build order`);
  return main;
};

const convert = (slug: string, header: BoPlanHeader) =>
  toBuild(toBoPlan(readMainBuildOrder(slug, header), header), {
    faction: getCatalog(header.factionId),
    mercenary: header.mercenaryId === null ? null : getCatalog(header.mercenaryId),
  });

const stepsOf = (build: Build, entityId: string) =>
  [...build.timed, ...build.queued]
    .filter((step) => step.entityId === entityId)
    .sort((a, b) => Number(a.uid.slice(1)) - Number(b.uid.slice(1)));

const timingOf = (build: Build, uid: string) => {
  const timing = simulateReal(build).steps.find(({ stepUid }) => stepUid === uid);
  if (!timing) throw new Error(`no timing for ${uid}`);
  return timing;
};

const ceilOf = (seconds: number | null) => Math.ceil((seconds ?? Number.NaN) - 1e-9);

// First whole second after a start.
const afterStartOf = (seconds: number | null) => Math.floor((seconds ?? Number.NaN) + 1e-9) + 1;

// The build of a step's anchor, without the steps placed after it.
const withoutStep = (build: Build, uid: string): Build => ({
  ...build,
  timed: build.timed.filter((step) => step.uid !== uid),
  queued: build.queued.filter((step) => step.uid !== uid),
});

describe('toBoPlan', () => {
  it('should keep the buildable entities and turn the conditions into anchors', () => {
    const header = PARADOX_HEADER;
    const order = parseBuildOrder(
      ['1. Xol Harvester + "scout" + Replicate^1 -> when they attack: Power Core', '2. when 2:30: Gyroforge -> when 150 hexite and 100 flux: World Engine', '^1: Note.'].join('\n'),
    );
    const plan = toBoPlan(resolveBuildOrder(order, scopeOf(header)), header);

    expect(plan).toEqual({
      ...header,
      phases: [
        {
          number: 1,
          groups: [
            { anchor: { kind: 'after-previous' }, items: [{ entityId: 'the-xol/unit/xol-harvester', count: 1 }] },
            { anchor: { kind: 'after-previous' }, items: [{ entityId: 'the-xol/building/power-core', count: 1 }] },
          ],
        },
        {
          number: 2,
          groups: [
            { anchor: { kind: 'time', seconds: 150 }, items: [{ entityId: 'the-xol/building/gyroforge', count: 1 }] },
            { anchor: { kind: 'resources', hexite: 150, flux: 100 }, items: [{ entityId: 'the-xol/building/world-engine', count: 1 }] },
          ],
        },
      ],
    });
  });
});

describe('Exalted Arandi, main build order', () => {
  const build = convert('exalted-arandi', EXALTED_HEADER);
  const [firstConduit, secondConduit] = stepsOf(build, 'the-legion/building/idal-conduit');
  const [citadel] = stepsOf(build, 'the-legion/building/citadel');
  const [altar] = stepsOf(build, 'the-legion/building/altar');
  const [kraegar] = stepsOf(build, 'the-legion/hero/kraegar');
  const [garrisonTower] = stepsOf(build, 'the-legion/building/garrison-tower');

  it('should keep the header of the guide', () => {
    expect(build).toMatchObject({ ...EXALTED_HEADER, heroId: 'the-legion/hero/galavax' });
  });

  it('should place the first Idal Conduit at 0, the 2 Bestiary after its start, the Citadel after theirs (CA3)', () => {
    const bestiaries = stepsOf(build, 'the-legion/building/bestiary').slice(0, 2);
    const bestiariesAt = afterStartOf(timingOf(build, firstConduit.uid).startAt);
    const citadelAt = afterStartOf(Math.max(...bestiaries.map(({ uid }) => timingOf(build, uid).startAt ?? 0)));

    expect([firstConduit, ...bestiaries, citadel].map(({ at }) => at)).toEqual([0, bestiariesAt, bestiariesAt, citadelAt]);
  });

  it('should start the first group in the order of the build order', () => {
    const startOf = ({ uid }: { uid: string }) => timingOf(build, uid).startAt ?? Number.NaN;
    const [bestiary] = stepsOf(build, 'the-legion/building/bestiary');

    expect(startOf(firstConduit)).toBeLessThan(startOf(bestiary));
    expect(startOf(bestiary)).toBeLessThan(startOf(citadel));
  });

  it('should place the second Idal Conduit just after the start of the Citadel, read before it is placed (CA3)', () => {
    expect(secondConduit.at).toBe(afterStartOf(timingOf(withoutStep(build, secondConduit.uid), citadel.uid).startAt));
  });

  it('should start the Citadel before the second Idal Conduit, and both Bestiary before the Legion Labourers', () => {
    const startOf = ({ uid }: { uid: string }) => timingOf(build, uid).startAt ?? Number.NaN;
    const bestiariesStart = Math.max(...stepsOf(build, 'the-legion/building/bestiary').slice(0, 2).map(startOf));

    expect(startOf(citadel)).toBeLessThan(startOf(secondConduit));
    expect(stepsOf(build, 'the-legion/unit/legion-labourer').every((step) => startOf(step) > bestiariesStart)).toBe(true);
  });

  it('should start the Altar at the end of the Citadel, and Kraegar at the end of the Altar (CA3)', () => {
    expect(altar.at).toBe(ceilOf(timingOf(build, citadel.uid).endAt));
    expect(kraegar.at).toBe(ceilOf(timingOf(build, altar.uid).endAt));
  });

  it('should place the first group of phase 2 at the start of Kraegar (CA3)', () => {
    expect(garrisonTower.at).toBe(afterStartOf(timingOf(build, kraegar.uid).startAt));
  });

  it('should loop an Exalted on each of the first 2 Bestiary', () => {
    const bestiaries = stepsOf(build, 'the-legion/building/bestiary').slice(0, 2);

    expect(stepsOf(build, 'the-legion/unit/exalted')).toEqual(
      bestiaries.map(({ uid }) => expect.objectContaining({ producerUid: uid, at: 1, repeat: true })),
    );
  });

  it('should keep the loops in the link, and open them in the editor', () => {
    const decoded = decodeBuildCode(encodeBuild(build), { factionIds: ['the-legion'], mercenaryIds: ['arandi'] });
    if (decoded.status !== 'ok') throw new Error('invalid link');
    const opened = resolveBuildLink(decoded.link, getCatalog('the-legion'), getCatalog('arandi'));

    expect(opened.build.queued.filter(({ repeat }) => repeat).map(({ entityId }) => entityId)).toEqual([
      'the-legion/unit/exalted',
      'the-legion/unit/exalted',
    ]);
  });
});

describe('Paradox Opening, main build order (CA4)', () => {
  const build = convert('paradox-opening', PARADOX_HEADER);
  const merges = ['synapse', 'defiant', 'echo', 'paradox', 'eradicator', 'aegis'].map((slug) => `the-xol/unit/${slug}`);

  // Kieirra 2026-11-19: the order of the build order is kept, the World Engine waits for the Harvester to start.
  it('should start its first group in the order of the build order: Harvester, World Engine, Power Core, Penumbra', () => {
    const ids = ['the-xol/unit/xol-harvester', 'the-xol/building/world-engine', 'the-xol/building/power-core', 'arandi/building/arandi-penumbra'];
    const starts = ids.map((entityId) => timingOf(build, stepsOf(build, entityId)[0].uid).startAt ?? Number.NaN);

    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(starts.length);
  });

  // US-009: the merges and `Replicate (on Synapse)` are kept.
  it('should keep the merges and the copy of a Synapse (CA9)', () => {
    expect(merges.every((entityId) => stepsOf(build, entityId).length > 0)).toBe(true);
    expect(build.queued.filter(({ producerUid }) => producerUid === 'replicate').map(({ entityId }) => entityId)).toEqual(['the-xol/unit/synapse']);
    expect(build.heroId).toBe('arandi/hero/iolin');
  });

  it('should start each merge after its inputs, and warn on the 2nd Paradox (CA9)', () => {
    const result = simulateReal(build);
    const started = result.orders.filter(({ inputs, startAt }) => inputs !== undefined && startAt !== null);
    const [, secondParadox] = stepsOf(build, 'the-xol/unit/paradox');

    expect(started.length).toBeGreaterThan(0);
    expect(started.every(({ inputs = [], startAt }) => inputs.every(({ readyAt }) => readyAt <= (startAt ?? 0)))).toBe(true);
    expect(result.steps.find(({ stepUid }) => stepUid === secondParadox.uid)?.diagnostics.map(({ message }) => message)).toContain(
      '1 Paradox at a time in game: the tool never loses units.',
    );
  });

  it('should open in the editor with every step kept', () => {
    const decoded = decodeBuildCode(encodeBuild(build), { factionIds: ['the-xol'], mercenaryIds: ['arandi'] });
    if (decoded.status !== 'ok') throw new Error('invalid link');
    const opened = resolveBuildLink(decoded.link, getCatalog('the-xol'), getCatalog('arandi'));

    expect(opened.build.timed.length + opened.build.queued.length).toBe(build.timed.length + build.queued.length);
    expect(opened.build.queued.filter(({ producerUid }) => producerUid === 'replicate')).toHaveLength(1);
    expect(opened.build).toMatchObject({ title: 'Paradox Opening', author: 'Aureil', factionId: 'the-xol', mercenaryId: 'arandi' });
  });
});
