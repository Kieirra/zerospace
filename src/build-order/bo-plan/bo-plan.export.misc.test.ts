import { describe, expect, it } from 'vitest';
import { createSimulationContext, simulateBuild } from '../engine/engine.ts';
import { getCatalogWithMisc, toBuild } from '../engine/engine.wiki-fixtures.ts';
import { toBoPlan } from './bo-plan.export.ts';
import type { Build } from '../build-order.types.ts';

const CATALOGS = { faction: getCatalogWithMisc('the-legion'), mercenary: getCatalogWithMisc('arandi') };

const exportOf = (build: Build) =>
  toBoPlan(build, simulateBuild(build, createSimulationContext(build, CATALOGS.faction, CATALOGS.mercenary)), CATALOGS);

describe('toBoPlan: Misc steps (CA8)', () => {
  it('should write the same block when the build also holds talents and events', () => {
    const timed: [string, number][] = [
      ['the-legion/building/idal-conduit', 0],
      ['the-legion/building/bestiary', 20],
    ];
    const misc: [string, number][] = [
      ['misc/event/tower-xp-creeps', 300],
      ['the-legion/talent/efficient-upgrades', 300],
      ['arandi/talent/lore-of-flux', 300],
    ];
    const queued = ['the-legion/unit/legion-labourer'];

    expect(exportOf(toBuild('the-legion', 'arandi', [...timed, ...misc], queued))).toEqual(exportOf(toBuild('the-legion', 'arandi', timed, queued)));
  });
});
