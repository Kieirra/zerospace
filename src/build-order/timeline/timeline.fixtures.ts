// Test fixtures only: hand-made simulation results for the timeline helpers.
import { toCatalogMap } from '../build-order.helpers.ts';
import { entity } from '../engine/engine.fixtures.ts';
import type { Build, BuildEntity } from '../build-order.types.ts';
import type { Lane, OrderTiming, SimulationResult, StepTiming } from '../engine/engine.types.ts';

export const BARRACKS = entity('building/barracks', { kind: 'building', category: 'building', duration: 30 });
export const BULWARK = entity('building/bulwark', { kind: 'building', category: 'mercenary-building' });
export const SENTINEL = entity('unit/sentinel', { cost: { hexite: 75, flux: 75 }, duration: 36 });
export const SKIMMER = entity('unit/skimmer', { category: 'mercenary-unit', count: 2, cost: { hexite: 225, flux: 0 } });
export const ROUNDS = entity('upgrade/rounds', { kind: 'upgrade', category: 'research' });
export const ASTER = entity('hero/aster', { kind: 'hero', category: 'hero', displayName: 'Prefect Aster', supply: 10 });
export const GALAVAX = entity('hero/galavax', { kind: 'hero', category: 'hero', duration: 45 });

export const CATALOG = toCatalogMap([BARRACKS, BULWARK, SENTINEL, SKIMMER, ROUNDS, ASTER, GALAVAX]);

export const order = (stepUid: string, target: BuildEntity, fields: Partial<OrderTiming> = {}): OrderTiming => ({
  stepUid,
  entityId: target.id,
  occurrence: 0,
  laneId: null,
  clickAt: 0,
  startAt: 0,
  endAt: 10,
  waits: {},
  ...fields,
});

export const stepTiming = (stepUid: string, fields: Partial<StepTiming> = {}): StepTiming => ({
  stepUid,
  clickAt: 0,
  startAt: 0,
  endAt: 10,
  laneId: null,
  diagnostics: [],
  ...fields,
});

export const lane = (id: string, label: string): Lane => ({
  id,
  entityId: BARRACKS.id,
  originalEntityId: BARRACKS.id,
  label,
  isStarting: false,
  startAt: 0,
  readyAt: 0,
  idle: [],
});

export const result = (fields: Partial<SimulationResult> = {}): SimulationResult => ({
  steps: [],
  orders: [],
  lanes: [],
  samples: [],
  endTime: 0,
  supply: { used: 0, cap: null, isChecked: false },
  diagnostics: [],
  heroes: { setup: null },
  ...fields,
});

// Timed steps as [uid, entity, at], queued steps as [uid, entity, producerUid?].
export const viewBuild = (
  timed: [string, BuildEntity, number][],
  queued: [string, BuildEntity, string?][] = [],
  heroId: string | null = null,
): Build => ({
  version: 3,
  dataVersion: 'test',
  factionId: 'test',
  mercenaryId: null,
  heroId,
  title: '',
  author: '',
  timed: timed.map(([uid, target, at]) => ({ uid, entityId: target.id, at })),
  queued: queued.map(([uid, target, producerUid]) => ({ uid, entityId: target.id, ...(producerUid === undefined ? {} : { producerUid }) })),
});
