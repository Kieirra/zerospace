import { describe, expect, it } from 'vitest';
import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { entities, getCatalog, sideFiles } from '../engine/engine.wiki-fixtures.ts';
import { resolveBuildLink } from '../link/link.resolve.ts';
import { isBuildableEntity } from './catalog.helpers.ts';

// A unit made only by the building of its name, on the same side: the building is the unit (Kieirra 2026-11-19).
const findBuildingUnits = () =>
  entities
    .filter(isBuildableEntity)
    .filter(({ kind, producedBy = [] }) => kind === 'unit' && producedBy.length === 1)
    .filter((unit) => {
      const building = entities.find(({ id }) => id === unit.producedBy?.[0]);
      return building?.kind === 'building' && building.faction === unit.faction && building.name === unit.name;
    });

describe('Side catalogs: the building is the unit (Kieirra 2026-11-19)', () => {
  it('should find exactly the Dreadnought, the Terror Tank and the Strider over every side', () => {
    expect(findBuildingUnits().map(({ id }) => id).sort()).toEqual([
      'protectorate/unit/strider',
      'the-legion/unit/dreadnought',
      'the-legion/unit/terror-tank',
    ]);
  });

  it.each([
    ['the-legion', 'dreadnought', 15, { hexite: 150, flux: 250 }, 80],
    ['the-legion', 'terror-tank', 15, { hexite: 250, flux: 150 }, 90],
    ['protectorate', 'strider', 6, { hexite: 225, flux: 225 }, 60],
  ] as const)('should offer the %s %s once, as a building with the supply of its unit and its own cost', (sideId, slug, supply, cost, duration) => {
    const named = getCatalog(sideId).entities.filter(({ id }) => id.endsWith(`/${slug}`));

    expect(named.map(({ id, displayName, supply: used, cost: paid, duration: time }) => ({ id, displayName, used, paid, time }))).toEqual([
      { id: `${sideId}/building/${slug}`, displayName: named[0]?.name, used: supply, paid: cost, time: duration },
    ]);
  });

  it.each(sideFiles.map(({ id }) => id))('should offer no unit of %s whose building is the unit', (sideId) => {
    const unitIds = new Set(findBuildingUnits().map(({ id }) => id));

    expect(getCatalog(sideId).entities.filter(({ id }) => unitIds.has(id))).toEqual([]);
  });

  it('should open an old link holding such a unit without it', () => {
    const opened = resolveBuildLink(
      {
        dataVersion: STEAM_BUILD_ID,
        factionId: 'protectorate',
        mercenaryId: 'arandi',
        heroRef: null,
        title: '',
        author: '',
        timed: [{ ref: 'b.strider', at: 0, producerIndex: null }],
        queued: [{ ref: 'u.strider', producerIndex: 0, at: null }],
      },
      getCatalog('protectorate'),
      getCatalog('arandi'),
    );

    expect([...opened.build.timed, ...opened.build.queued].map(({ entityId }) => entityId)).toEqual(['protectorate/building/strider']);
  });
});
