import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toBoPlan as exportBoPlan } from '../../build-order/bo-plan/bo-plan.export.ts';
import { toBuild } from '../../build-order/bo-plan/bo-plan.import.ts';
import { printBoPlan } from '../../build-order/bo-plan/bo-plan.print.ts';
import { entities, getCatalog, sideFiles, simulateReal } from '../../build-order/engine/engine.wiki-fixtures.ts';
import { decodeBuildCode, encodeBuild } from '../../build-order/link/link.codec.ts';
import { resolveBuildLink } from '../../build-order/link/link.resolve.ts';
import { extractBuildOrders, parseBuildOrder, resolveBuildOrder } from '../guide-page/build-order/build-order.helpers.ts';
import { toBoPlan } from './theorycraft-link.helpers.ts';
import type { Build } from '../../build-order/build-order.types.ts';
import type { BoPlanHeader } from './theorycraft-link.helpers.ts';

const GUIDES_DIRECTORY = new URL('../../../data/guides/', import.meta.url);

const catalogsOf = ({ factionId, mercenaryId }: BoPlanHeader) => ({
  faction: getCatalog(factionId),
  mercenary: mercenaryId === null ? null : getCatalog(mercenaryId),
});

const scopeOf = ({ factionId, mercenaryId }: BoPlanHeader) => ({
  label: `${factionId} + ${mercenaryId}`,
  entities: entities.filter(({ faction, kind }) => [factionId, mercenaryId].includes(faction) && kind !== 'talent'),
});

// Text of a build order (no fences) to the Build the editor opens: guide parser, `View timeline` link, editor.
const toGuideBuild = (text: string, header: BoPlanHeader) => {
  const build = toBuild(toBoPlan(resolveBuildOrder(parseBuildOrder(text), scopeOf(header)), header), catalogsOf(header));
  const decoded = decodeBuildCode(encodeBuild(build), { factionIds: [header.factionId], mercenaryIds: [header.mercenaryId ?? ''] });
  if (decoded.status !== 'ok') throw new Error('invalid link');
  const { faction, mercenary } = catalogsOf(header);
  return resolveBuildLink(decoded.link, faction, mercenary).build;
};

const exportOf = (build: Build, header: BoPlanHeader) => printBoPlan(exportBoPlan(build, simulateReal(build), catalogsOf(header)), catalogsOf(header));

const unfence = (block: string) => block.split('\n').slice(1, -1).join('\n');

const entityIdsOf = (build: Build) => [...build.timed, ...build.queued].map(({ entityId }) => entityId).sort();

// Each entity's times, in time order: the n-th copy of an entity matches the n-th one.
const timesOf = (build: Build) => {
  const times = new Map<string, number[]>();
  for (const { entityId, at } of [...build.timed, ...build.queued]) times.set(entityId, [...(times.get(entityId) ?? []), at ?? -1]);
  return new Map([...times].map(([entityId, list]) => [entityId, list.sort((a, b) => a - b)]));
};

const readHeader = (slug: string, text: string): BoPlanHeader | null => {
  const field = (name: string) => text.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
  const factionId = field('faction');
  if (!factionId) return null;
  const mercenaryId = field('mercenary') ?? null;
  const heroName = field('hero');
  const hero = entities.find(({ kind, name, faction }) => kind === 'hero' && name === heroName && [factionId, mercenaryId].includes(faction));
  return { factionId, mercenaryId, heroId: hero?.id ?? null, title: slug, author: field('author') ?? '' };
};

const GUIDES = readdirSync(GUIDES_DIRECTORY)
  .filter((file) => file.endsWith('.md') && file !== 'README.md')
  .flatMap((file) => {
    const text = readFileSync(new URL(file, GUIDES_DIRECTORY), 'utf8');
    const [, frontmatter, body] = text.split(/^---$/m);
    const header = readHeader(file.replace(/\.md$/, ''), frontmatter);
    const { main } = extractBuildOrders(body);
    return header && main ? [[file, main, header] as const] : [];
  });

describe('Copy as BO: round trip on the main build order of each guide (CA7)', () => {
  it('should find the guides with a main build order', () => {
    expect(GUIDES.map(([file]) => file)).toEqual(expect.arrayContaining(['exalted-arandi.md', 'paradox-opening.md']));
  });

  describe.each(GUIDES)('%s', (_, main, header) => {
    const original = toGuideBuild(main, header);
    const printed = exportOf(original, header);
    const reopened = toGuideBuild(unfence(printed), header);

    it('should print a block the guide parser reads back, the same once more (idempotence)', () => {
      expect(printed.startsWith('```bo\n') && printed.endsWith('\n```')).toBe(true);
      expect(exportOf(reopened, header)).toBe(printed);
    });

    it('should keep every step (content)', () => {
      expect(entityIdsOf(reopened)).toEqual(entityIdsOf(original));
    });

    it('should keep every time within 2 s (timings)', () => {
      const before = timesOf(original);
      const gaps = [...timesOf(reopened)].flatMap(([entityId, times]) =>
        times.map((at, index) => Math.abs(at - (before.get(entityId)?.[index] ?? Number.NaN))),
      );

      expect(gaps.every((gap) => gap <= 2)).toBe(true);
    });

    it('should write the wiki names, never a display name (names)', () => {
      const catalogs = catalogsOf(header);
      const renamed = [...catalogs.faction.entities, ...(catalogs.mercenary?.entities ?? [])].filter(({ name, displayName }) => name !== displayName);

      expect(renamed.filter(({ displayName }) => printed.includes(displayName))).toEqual([]);
    });
  });
});

// One small build per faction, the mercenaries taken in turn, with a mercenary building and its recruit.
describe('Copy as BO on every faction and mercenary', () => {
  const factionIds = sideFiles.filter(({ kind }) => kind === 'faction').map(({ id }) => id);
  const mercenaryIds = sideFiles.filter(({ kind }) => kind === 'mercenary').map(({ id }) => id);
  const pairs = mercenaryIds.map((mercenaryId, index) => [factionIds[index % factionIds.length], mercenaryId] as const);

  it.each(pairs)('should export a %s + %s build the guide parser reads back with every step', (factionId, mercenaryId) => {
    const header: BoPlanHeader = { factionId, mercenaryId, heroId: null, title: 'T', author: 'K' };
    const { faction, mercenary } = catalogsOf(header);
    const isProducer = (id: string) => faction.entities.some((entity) => entity.id === id && entity.category === 'building' && !entity.economy);
    const unit = faction.entities.find(({ category, producedBy }) => category === 'unit' && producedBy.some(isProducer));
    const building = faction.entities.find(({ id }) => unit?.producedBy.includes(id) && isProducer(id));
    const mercenaryBuilding = mercenary?.entities.find(({ category }) => category === 'mercenary-building');
    const recruit = mercenary?.entities.find(({ category, producedBy }) => category === 'mercenary-unit' && producedBy.includes(mercenaryBuilding?.id ?? ''));
    const steps = [building, mercenaryBuilding].flatMap((entity, index) => (entity ? [{ uid: `s${index + 1}`, entityId: entity.id, at: index * 30 }] : []));
    const build: Build = {
      version: 3,
      dataVersion: 'test',
      factionId,
      mercenaryId,
      heroId: null,
      title: 'T',
      author: 'K',
      timed: steps,
      queued: [unit, recruit].flatMap((entity, index) => (entity ? [{ uid: `s${index + 3}`, entityId: entity.id }] : [])),
    };

    expect(build.timed.length + build.queued.length).toBe(4);
    expect(entityIdsOf(toGuideBuild(unfence(exportOf(build, header)), header))).toEqual(entityIdsOf(build));
  });
});
