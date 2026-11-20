// Test fixtures only: catalogs rebuilt from the real `data/wiki/` files (read only).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toSide, toSideCatalog, toSideEntities } from '../catalog/catalog.helpers.ts';
import { toNameKinds } from '../catalog/catalog.names.ts';
import { known, unknown } from './engine.fixtures.ts';
import { createSimulationContext, simulateBuild } from './engine.ts';
import type { FactionFile } from '../../wiki/wiki-data.types.ts';
import type { Entity } from '../../wiki/wiki.types.ts';
import type { Build, QueuedStep, SideCatalog } from '../build-order.types.ts';
import type { SimulationContext } from './engine.types.ts';

const WIKI_DIRECTORY = join(process.cwd(), 'data', 'wiki');
const NON_SIDE_FILES = ['source.json', '_report.json'];

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

export const sideFiles: FactionFile[] = readdirSync(WIKI_DIRECTORY)
  .filter((file) => file.endsWith('.json') && !NON_SIDE_FILES.includes(file))
  .map((file) => readJson(join(WIKI_DIRECTORY, file)));

export const entities: Entity[] = sideFiles.flatMap(({ id }) =>
  readdirSync(join(WIKI_DIRECTORY, id)).flatMap((kind) =>
    readdirSync(join(WIKI_DIRECTORY, id, kind)).map((file) => readJson(join(WIKI_DIRECTORY, id, kind, file))),
  ),
);

const getSide = (sideId: string) => {
  const source = sideFiles.find(({ id }) => id === sideId);
  if (!source) throw new Error(`Unknown side ${sideId}`);
  return toSide(source, sideFiles);
};

// The wiki entities of a side, without its Misc steps.
export const getCatalog = (sideId: string): SideCatalog => {
  const side = getSide(sideId);
  return { side, entities: toSideEntities(side, entities, () => undefined), nameKinds: toNameKinds(side.id, entities) };
};

// The catalog of the editor: the side and its Misc steps (US-008).
export const getCatalogWithMisc = (sideId: string): SideCatalog => toSideCatalog(getSide(sideId), entities, () => undefined);

// Timed steps as [entity id, at], queued steps as entity ids (Auto); uids are 'b1', 'b2'… then 'u1', 'u2'…
export const toBuild = (factionId: string, mercenaryId: string | null, timed: [string, number][], queued: string[] = []): Build => ({
  version: 3,
  dataVersion: 'test',
  factionId,
  mercenaryId,
  heroId: null,
  title: '',
  author: '',
  timed: timed.map(([entityId, at], index) => ({ uid: `b${index + 1}`, entityId, at })),
  queued: queued.map((entityId, index) => ({ uid: `u${index + 1}`, entityId })),
});

export const toRealContext = (build: Build): SimulationContext =>
  createSimulationContext(
    build,
    getCatalog(build.factionId),
    build.mercenaryId ? getCatalog(build.mercenaryId) : null,
  );

export const simulateReal = (build: Build, context: SimulationContext = toRealContext(build)) =>
  simulateBuild(build, context);

// A Xol build (US-009): timed steps as [entity id, at] ('b1', 'b2'…), queued steps with their pin, time, loop or
// Replicate ('u1', 'u2'…).
export const toXolBuild = (timed: [string, number][], queued: Omit<QueuedStep, 'uid'>[] = []): Build => ({
  ...toBuild('the-xol', null, timed),
  queued: queued.map((step, index) => ({ uid: `u${index + 1}`, ...step })),
});

// The Xol catalog with its talents, a full bank and the supply left unchecked: the rules of US-009 alone.
export const toXolContext = (build: Build): SimulationContext => {
  const context = createSimulationContext(build, getCatalogWithMisc('the-xol'), null);
  return { ...context, values: { ...context.values, startingHexite: known(5000), startingFlux: known(5000), startingSupply: unknown() } };
};
