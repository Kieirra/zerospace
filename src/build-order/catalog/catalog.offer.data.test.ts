import { describe, expect, it } from 'vitest';
import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { entityHref } from '../../wiki/wiki.helpers.ts';
import { getResearchLocation } from '../engine/engine.research-location.ts';
import { entities, getCatalog, sideFiles } from '../engine/engine.wiki-fixtures.ts';
import { RESEARCH_LOCATIONS } from '../game-data/game-data.constants.ts';
import { resolveBuildLink } from '../link/link.resolve.ts';
import { isBuildableEntity, toBuildEntity } from './catalog.helpers.ts';
import type { BuildEntity } from '../build-order.types.ts';

const SIDE_IDS = sideFiles.map(({ id }) => id);
const FACTION_IDS = sideFiles.filter(({ kind }) => kind === 'faction').map(({ id }) => id);
const MERCENARY_IDS = sideFiles.filter(({ kind }) => kind === 'mercenary').map(({ id }) => id);

// Every entity of a side as the data gives it, before the tool picks what it offers.
const allOf = (sideId: string): BuildEntity[] => {
  const kind = sideFiles.find(({ id }) => id === sideId)?.kind ?? 'faction';
  return entities.filter(isBuildableEntity).filter(({ faction }) => faction === sideId).map((entity) => toBuildEntity(entity, kind));
};

const slugOf = (id: string) => id.slice(id.lastIndexOf('/') + 1);

const locationOf = (research: BuildEntity, sideEntities: BuildEntity[]) =>
  getResearchLocation(research, new Map(sideEntities.map((entity) => [entity.id, entity])), RESEARCH_LOCATIONS);

// The building is the unit (catalog.building-units.data.test.ts).
const BUILDING_UNITS = ['the-legion/unit/dreadnought', 'the-legion/unit/terror-tank', 'protectorate/unit/strider'];

const NO_LOCATION: Record<string, string[]> = {
  protectorate: ['veterancy'],
  grell: ['biomass-healing'],
  'the-legion': [
    'anti-air-missile-turret',
    'bomb-bay',
    'command-module',
    'dreadnought-shield-generator',
    'flame-turret',
    'gatling-gun',
    'pulseforge-accelerator',
    'shield-generator',
  ],
  'the-xol': ['defiant', 'echo', 'eradicator', 'gravitron', 'paradox', 'roller', 'spectron', 'synapse', 'xyther'].map((unit) => `molten-${unit}`),
};

describe('Side catalogs: upgrades done on a unit (Kieirra 2026-11-19)', () => {
  it.each(SIDE_IDS)('should leave out of %s the research no building can host, and only those', (sideId) => {
    const all = allOf(sideId);
    const without = all.filter(({ category }) => category === 'research').filter((research) => locationOf(research, all) === undefined);
    const offeredIds = new Set(getCatalog(sideId).entities.map(({ id }) => id));

    expect(without.map(({ id }) => slugOf(id)).sort()).toEqual((NO_LOCATION[sideId] ?? []).sort());
    expect(without.filter(({ id }) => offeredIds.has(id))).toEqual([]);
    expect(all.filter(({ id }) => !offeredIds.has(id) && !BUILDING_UNITS.includes(id))).toEqual(without);
  });

  it.each(SIDE_IDS)('should give a research location to every research %s offers', (sideId) => {
    const offered = getCatalog(sideId).entities;

    expect(offered.filter((entity) => entity.category === 'research' && locationOf(entity, offered) === undefined)).toEqual([]);
  });

  it('should open an old link holding such an upgrade without it', () => {
    const opened = resolveBuildLink(
      {
        dataVersion: STEAM_BUILD_ID,
        factionId: 'the-legion',
        mercenaryId: null,
        heroRef: null,
        title: '',
        author: '',
        timed: [
          { ref: 'b.citadel', at: 0, producerIndex: null },
          { ref: 'r.bomb-bay', at: 60, producerIndex: null },
        ],
        queued: [],
      },
      getCatalog('the-legion'),
      null,
    );

    expect(opened.build.timed.map(({ entityId }) => entityId)).toEqual(['the-legion/building/citadel']);
  });
});

describe('Side catalogs: Grell research locations (deduced from the data, Kieirra 2026-11-19)', () => {
  const grell = getCatalog('grell').entities;
  const researches = grell.filter(({ category, appliesTo }) => category === 'research' && appliesTo.length > 0);

  it('should research every upgrade of a unit in the same building', () => {
    const byUnit = new Map<string, Set<string | undefined>>();
    for (const research of researches) {
      byUnit.set(research.appliesTo[0], (byUnit.get(research.appliesTo[0]) ?? new Set()).add(locationOf(research, grell)));
    }

    expect([...byUnit].filter(([, places]) => places.size !== 1)).toEqual([]);
  });

  it.each([
    ['camouflage', 'young-canopy'],
    ['corrosive-secretion', 'young-canopy'],
    ['dissolving-venom', 'young-canopy'],
    ['endorphic-frenzy', 'young-canopy'],
    ['pouncing-reflex', 'young-canopy'],
    ['accelerated-mitosis', 'synapse-canopy'],
    ['coagulated-membrane', 'synapse-canopy'],
    ['hemal-vents', 'synapse-canopy'],
  ])('should research %s in the %s', (slug, building) => {
    const research = researches.find(({ id }) => id === `grell/upgrade/${slug}`);

    expect(research && locationOf(research, grell)).toBe(`grell/building/${building}`);
  });
});

describe('Side catalogs: entities sharing a name (Kieirra 2026-11-19)', () => {
  const offered = (sideId: string) => getCatalog(sideId).entities.filter(({ isVariant }) => !isVariant);
  const renamed = SIDE_IDS.flatMap((sideId) => offered(sideId).filter(({ name, displayName }) => displayName !== name && !displayName.startsWith(`${name} +`)));

  it('should tell apart the offered entities sharing a name by the upgraded entity, else the kind', () => {
    expect(renamed.map(({ displayName }) => displayName).sort()).toEqual(['Performance Enhancers (Steelsworn)', 'Performance Enhancers (Thrall)']);
  });

  it.each(FACTION_IDS.flatMap((factionId) => MERCENARY_IDS.map((mercenaryId) => [factionId, mercenaryId])))(
    'should offer no two entities with the same display name in %s + %s',
    (factionId, mercenaryId) => {
      const names = [...offered(factionId), ...offered(mercenaryId)].map(({ displayName }) => displayName);

      expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
    },
  );
});

describe('Side catalogs: wiki pages', () => {
  // The wiki makes one page per data file `data/wiki/<faction>/<kind>/<slug>.json` (getEntityPaths).
  const pages = new Set(entities.map(({ id }) => entityHref(id)));

  it.each(SIDE_IDS)('should link every entity of %s to its wiki page', (sideId) => {
    expect(getCatalog(sideId).entities.filter(({ id }) => !pages.has(entityHref(id)) || id.split('/').length !== 3)).toEqual([]);
  });
});
