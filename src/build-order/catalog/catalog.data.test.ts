import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getResearchLocation } from '../engine/engine.research-location.ts';
import { MAX_FLUX_NODES, RESEARCH_LOCATIONS } from '../game-data/game-data.constants.ts';
import { toCatalogMap } from '../build-order.helpers.ts';
import { resolveGameValue } from '../game-data/game-data.helpers.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { getHeroPool, getStartingBuildingId, toSide, toSideEntities } from './catalog.helpers.ts';
import type { FactionFile } from '../../wiki/wiki-data.types.ts';
import type { Entity } from '../../wiki/wiki.types.ts';

const WIKI_DIRECTORY = join(process.cwd(), 'data', 'wiki');
const NON_SIDE_FILES = ['source.json', '_report.json'];

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const sideFiles: FactionFile[] = readdirSync(WIKI_DIRECTORY)
  .filter((file) => file.endsWith('.json') && !NON_SIDE_FILES.includes(file))
  .map((file) => readJson(join(WIKI_DIRECTORY, file)));

const entities: Entity[] = sideFiles.flatMap(({ id }) =>
  readdirSync(join(WIKI_DIRECTORY, id)).flatMap((kind) =>
    readdirSync(join(WIKI_DIRECTORY, id, kind)).map((file) => readJson(join(WIKI_DIRECTORY, id, kind, file))),
  ),
);

const getSide = (sideId: string) => {
  const source = sideFiles.find(({ id }) => id === sideId);
  if (!source) throw new Error(`Unknown side ${sideId}`);
  return toSide(source, sideFiles);
};

const getEntities = (sideId: string) => toSideEntities(getSide(sideId), entities, () => undefined);

const getEntity = (id: string) => getEntities(id.split('/')[0]).find((entity) => entity.id === id);

const getPoolNames = (factionId: string, mercenaryId: string) =>
  getHeroPool(getSide(factionId), getSide(mercenaryId), resolveRules(factionId)).map(({ heroId, origin }) => [
    getEntity(heroId)?.name,
    origin,
  ]);

describe('Side catalog from the wiki data', () => {
  it('should serve the Protectorate side with its three heroes', () => {
    expect(getSide('protectorate')).toMatchObject({ id: 'protectorate', kind: 'faction' });
    expect(getSide('protectorate').heroIds).toHaveLength(3);
  });

  it('should serve the Sentinel with its cost, time, supply, producer and requirement', () => {
    expect(getEntity('protectorate/unit/sentinel')).toMatchObject({
      category: 'unit',
      cost: { hexite: 75, flux: 75 },
      duration: 36,
      supply: 3,
      producedBy: ['protectorate/building/barracks'],
      requires: ['protectorate/building/research-lab'],
    });
  });

  it.each(sideFiles.map(({ id }) => id))('should only reference entities of its own catalog for %s', (sideId) => {
    const sideEntities = getEntities(sideId);
    const ids = new Set(sideEntities.map(({ id }) => id));

    const references = sideEntities.flatMap(({ producedBy, requires, transformsInto }) => [
      ...producedBy,
      ...requires,
      ...(transformsInto ? [transformsInto] : []),
    ]);

    expect(references.filter((reference) => !ids.has(reference))).toEqual([]);
  });

  it.each([
    'the-xol/unit/aegis',
    'grell/unit/arkanid',
    'grell/unit/seedling',
    'valkaru/unit/valkaru-beast',
  ])('should keep %s with no producer when the data gives none', (id) => {
    expect(getEntity(id)?.producedBy).toEqual([]);
  });

  it('should keep a free setup hero in the catalog when it has no cost nor build time', () => {
    expect(getEntity('protectorate/hero/prefect-aster')).toMatchObject({ cost: { hexite: 0, flux: 0 }, duration: null });
  });
});

describe('Catalog economy from the wiki data', () => {
  it('should read the Operating Tower Hexite economy', () => {
    expect(getEntity('protectorate/building/operating-tower')?.economy).toEqual({
      kind: 'hexite-base',
      workers: 6,
      hexitePerWorkerPerMin: 56,
      workerSpawnSeconds: 24,
      pitHexite: 4300,
      depletedRatePercent: 25,
      // 448 / min for the 6 workers on a rich spot.
      rich: { hexitePerWorkerPerMin: 448 / 6, pitHexite: 5800 },
    });
  });

  it('should read the Prospector as a Flux harvester', () => {
    expect(getEntity('protectorate/unit/prospector')).toMatchObject({
      category: 'harvester',
      economy: { kind: 'flux-harvester', fluxPerMin: 60, harvestersPerNode: 2 },
    });
  });

  it('should read the World Engine Hexite economy', () => {
    expect(getEntity('the-xol/building/world-engine')?.economy).toMatchObject({
      workers: 4,
      workerSpawnSeconds: 33.5,
      hexitePerWorkerPerMin: 84,
    });
  });
});

describe('Flux harvester cap from the wiki data', () => {
  it.each([
    ['the-xol', 4],
    ['protectorate', 8],
    ['grell', 8],
    ['the-legion', 12],
  ])('should cap %s at %i harvesters when every Flux node is taken', (factionId, expected) => {
    const harvester = getEntities(factionId).find(({ category }) => category === 'harvester');
    const nodes = resolveGameValue(MAX_FLUX_NODES, factionId).value ?? 0;

    expect(harvester?.economy?.kind === 'flux-harvester' && nodes * harvester.economy.harvestersPerNode).toBe(expected);
  });
});

describe('Catalog supply provided from the wiki data', () => {
  it.each([
    ['protectorate/building/supply-platform', 12],
    ['the-legion/building/idal-conduit', 12],
    ['grell/building/nourishing-pod', 12],
    ['the-xol/building/power-core', 8],
  ])('should read the supply provided by %s', (id, expected) => {
    expect(getEntity(id)?.supplyProvided).toBe(expected);
  });

  it('should give no supply for the Barracks', () => {
    expect(getEntity('protectorate/building/barracks')?.supplyProvided).toBeUndefined();
  });
});

describe('Catalog heroes from the wiki data', () => {
  it('should show Kraegar with his war-beast', () => {
    expect(getEntity('the-legion/hero/kraegar')?.displayName).toBe("Kraegar + Krag'vorn");
  });

  it('should count both Mondar and Torq in the supply', () => {
    expect(getEntity('valkaru/hero/mondar-and-torq')?.supply).toBe(10);
  });

  it.each([
    ['valkaru/unit/valkaru-hound', 8],
    ['grell/unit/stinger', 3],
    ['the-legion/unit/thrall', 3],
    ['protectorate/unit/sentinel', 3],
  ])('should count the supply of every unit of the pack when %s is produced', (id, expected) => {
    expect(getEntity(id)?.supply).toBe(expected);
  });

  it('should find Marv and Mera as common heroes', () => {
    expect(getSide('protectorate').commonHeroIds).toEqual(['protectorate/hero/marv', 'protectorate/hero/mera']);
  });

  it('should pool Protectorate and Marran heroes', () => {
    expect(getPoolNames('protectorate', 'marran')).toEqual([
      ['Prefect Aster', 'faction'],
      ['Marv', 'common'],
      ['Mera', 'common'],
      ['Hel', 'mercenary'],
    ]);
  });

  it('should pool Xol and Valkaru heroes', () => {
    expect(getPoolNames('the-xol', 'valkaru')).toEqual([
      ['Anrubic', 'faction'],
      ['Mondar and Torq', 'mercenary'],
    ]);
  });

  it('should pool only The Legion heroes with a mercenary', () => {
    expect(getPoolNames('the-legion', 'marran').map(([name]) => name)).toEqual(['Galavax', 'Inquisitress', 'Kraegar']);
  });
});

describe('Starting building from the wiki data', () => {
  it.each([
    ['grell', 'grell/building/bloomwell'],
    ['protectorate', 'protectorate/building/operating-tower'],
    ['the-legion', 'the-legion/building/garrison-tower'],
    ['the-xol', 'the-xol/building/world-engine'],
  ])('should compute the starting building of %s', (factionId, expected) => {
    expect(getStartingBuildingId(getEntities(factionId))).toBe(expected);
  });
});

describe('Mercenary catalog from the wiki data', () => {
  it('should keep both Chakru buildings as mercenary buildings', () => {
    const buildings = getEntities('chakru-kingdom').filter(({ category }) => category === 'mercenary-building');

    expect(buildings).toHaveLength(2);
  });

  it.each(sideFiles.filter(({ kind }) => kind === 'mercenary').map(({ id }) => id))(
    'should read the stacks of every %s building from the data',
    (sideId) => {
      const buildings = getEntities(sideId).filter(({ category }) => category === 'mercenary-building');

      expect(buildings.length).toBeGreaterThan(0);
      for (const building of buildings) expect(building.productionCharges).toEqual({ initial: 1, max: 4, recharge: 90 });
    },
  );

  it('should give every recruit an instant duration, absent from the data', () => {
    const recruits = getEntities('marran').filter(({ category }) => category === 'mercenary-unit');

    expect(recruits.length).toBeGreaterThan(0);
    expect(recruits.every(({ duration }) => duration === 0)).toBe(true);
  });
});

describe('Protectorate research location from the wiki data', () => {
  const LAB_BY_PRODUCER: Record<string, string> = {
    'protectorate/building/barracks': 'protectorate/building/research-lab',
    'protectorate/building/assembly-plant': 'protectorate/building/mechanical-research-lab',
    'protectorate/building/war-foundry': 'protectorate/building/mechanical-research-lab',
    'protectorate/building/skydock': 'protectorate/building/mechanical-research-lab',
  };
  const protectorate = getEntities('protectorate');
  const catalog = toCatalogMap(protectorate);
  const researches = protectorate.flatMap((research) => {
    if (research.category !== 'research') return [];
    const producer = catalog.get(research.appliesTo[0] ?? '')?.producedBy[0];
    const lab = producer ? LAB_BY_PRODUCER[producer] : undefined;
    return lab ? [[research.id, lab]] : [];
  });

  it.each(researches)('should research %s in %s (Mazar 2026-11-12)', (researchId, lab) => {
    expect(getResearchLocation(catalog.get(researchId)!, catalog, RESEARCH_LOCATIONS)).toBe(lab);
  });
});
