import { describe, expect, it } from 'vitest';
import { resolveRules } from '../rules/rules.helpers.ts';
import {
  getCategory,
  getCommonHeroIds,
  getDefaultHeroId,
  getHeroPool,
  toBuildEntity,
  toEconomy,
} from './catalog.helpers.ts';
import type { EconomyStat } from '../../wiki/wiki-data.types.ts';
import type { Side } from '../build-order.types.ts';
import type { BuildableEntity } from './catalog.helpers.ts';

const entity = (fields: Partial<BuildableEntity> = {}): BuildableEntity => ({
  id: 'protectorate/unit/sentinel',
  kind: 'unit',
  faction: 'protectorate',
  name: 'Sentinel',
  ...fields,
});

const HEXITE_BASE_STATS: EconomyStat[] = [
  { label: 'Hexite / min', value: 336, unit: '/min' },
  { label: 'Hexite / min (rich)', value: 504, unit: '/min' },
  { label: 'Hexite / min per worker', value: 56, unit: '/min' },
  { label: 'Workers', value: 6 },
  { label: 'Worker spawn time', value: 24, unit: 's' },
  { label: 'Pit hexite', value: 4300 },
  { label: 'Rate when depleted', value: 25, unit: '%' },
];

const HARVESTER_STATS: EconomyStat[] = [
  { label: 'Flux / min', value: 60, unit: '/min' },
  { label: 'Flux / min (rich)', value: 105, unit: '/min' },
  { label: 'Harvesters per node', value: 2 },
  { label: 'Energy / min', value: 10, unit: '/min' },
];

const side = (heroIds: string[], commonHeroIds: string[] = []): Pick<Side, 'kind' | 'heroIds' | 'commonHeroIds'> => ({
  kind: 'faction',
  heroIds,
  commonHeroIds,
});

describe('Entity category', () => {
  it.each([
    ['mercenary building', { kind: 'building' as const }, 'mercenary', 'mercenary-building'],
    ['mercenary unit', { kind: 'unit' as const }, 'mercenary', 'mercenary-unit'],
    ['hero', { kind: 'hero' as const }, 'faction', 'hero'],
    ['transformation', { kind: 'upgrade' as const, transformsInto: 'protectorate/building/strider' }, 'faction', 'transformation'],
    ['research', { kind: 'upgrade' as const }, 'faction', 'research'],
    ['harvester', { kind: 'unit' as const, economy: HARVESTER_STATS }, 'faction', 'harvester'],
    ['unit', { kind: 'unit' as const }, 'faction', 'unit'],
    ['building', { kind: 'building' as const }, 'faction', 'building'],
  ] as const)('should classify a %s', (_, fields, sideKind, expected) => {
    expect(getCategory(fields, sideKind)).toBe(expected);
  });

  it('should keep a mercenary hero in the hero category', () => {
    expect(getCategory({ kind: 'hero' }, 'mercenary')).toBe('hero');
  });
});

describe('Build entity', () => {
  it('should have a null duration when the data has neither build nor research time', () => {
    expect(toBuildEntity(entity(), 'faction').duration).toBeNull();
  });

  it('should keep a zero duration', () => {
    expect(toBuildEntity(entity({ buildTime: 0 }), 'faction').duration).toBe(0);
  });

  it('should use the research time of an upgrade', () => {
    expect(toBuildEntity(entity({ kind: 'upgrade', researchTime: 40 }), 'faction').duration).toBe(40);
  });

  it('should default the cost to zero and the count to one', () => {
    const built = toBuildEntity(entity({ cost: { hexite: 100 } }), 'faction');

    expect(built.cost).toEqual({ hexite: 100, flux: 0 });
    expect(built.count).toBe(1);
  });

  it('should keep a unit without producer with an empty producer list', () => {
    expect(toBuildEntity(entity(), 'faction').producedBy).toEqual([]);
  });

  it('should copy the exclusive group of a research', () => {
    const research = entity({ kind: 'upgrade', exclusiveGroup: 'Local.Prot.Rocket.specialize1' });

    expect(toBuildEntity(research, 'faction').exclusiveGroup).toBe('Local.Prot.Rocket.specialize1');
  });

  it('should mark a building obtained by transformation as variant', () => {
    const variant = entity({ kind: 'building', upgradedFrom: 'protectorate/building/operating-tower' });

    expect(toBuildEntity(variant, 'faction').isVariant).toBe(true);
  });

  it('should leave the image url absent when there is no image', () => {
    expect(toBuildEntity(entity(), 'faction').imageUrl).toBeUndefined();
  });

  it('should give a mercenary recruit an instant duration', () => {
    expect(toBuildEntity(entity({ id: 'marran/unit/marran-badger', faction: 'marran' }), 'mercenary').duration).toBe(0);
  });

  it('should copy the stacks of a mercenary building', () => {
    const charges = { initial: 1, max: 4, recharge: 90 };
    const bulwark = entity({ id: 'marran/building/marran-bulwark', kind: 'building', productionCharges: charges });

    expect(toBuildEntity(bulwark, 'mercenary').productionCharges).toEqual(charges);
  });
});

describe('Dual heroes', () => {
  const overrides = {
    'the-legion/hero/kraegar': { displayName: "Kraegar + Krag'vorn" },
    'valkaru/hero/mondar-and-torq': { unitCount: 2 },
  };

  it('should show the override display name', () => {
    const kraegar = entity({ id: 'the-legion/hero/kraegar', kind: 'hero', name: 'Kraegar', supply: 10 });

    expect(toBuildEntity(kraegar, 'faction', undefined, overrides)).toMatchObject({
      name: 'Kraegar',
      displayName: "Kraegar + Krag'vorn",
      supply: 10,
    });
  });

  it('should multiply the supply by the unit count', () => {
    const mondarAndTorq = entity({ id: 'valkaru/hero/mondar-and-torq', kind: 'hero', name: 'Mondar and Torq', supply: 5 });

    expect(toBuildEntity(mondarAndTorq, 'mercenary', undefined, overrides)).toMatchObject({
      displayName: 'Mondar and Torq',
      supply: 10,
    });
  });
});

describe('Economy', () => {
  it('should read a complete Hexite base economy', () => {
    expect(toEconomy({ kind: 'building', economy: HEXITE_BASE_STATS })).toEqual({
      kind: 'hexite-base',
      workers: 6,
      hexitePerWorkerPerMin: 56,
      workerSpawnSeconds: 24,
      pitHexite: 4300,
      depletedRatePercent: 25,
    });
  });

  it('should read a Flux harvester economy and ignore rich and energy labels', () => {
    expect(toEconomy({ kind: 'unit', economy: HARVESTER_STATS })).toEqual({
      kind: 'flux-harvester',
      fluxPerMin: 60,
      harvestersPerNode: 2,
    });
  });

  it('should return no economy when Workers is missing', () => {
    const economy = HEXITE_BASE_STATS.filter(({ label }) => label !== 'Workers');

    expect(toEconomy({ kind: 'building', economy })).toBeUndefined();
  });

  it('should return no economy when a value is not a number', () => {
    const economy = HARVESTER_STATS.map((stat) => (stat.label === 'Flux / min' ? { ...stat, value: [60, 70] } : stat));

    expect(toEconomy({ kind: 'unit', economy })).toBeUndefined();
  });

  it('should return no economy without economy block', () => {
    expect(toEconomy({ kind: 'building' })).toBeUndefined();
  });
});

describe('Hero pool', () => {
  const protectorate = side(
    ['protectorate/hero/marv', 'protectorate/hero/mera', 'protectorate/hero/prefect-aster'],
    ['protectorate/hero/marv', 'protectorate/hero/mera'],
  );
  const marran = side(['marran/hero/hel']);

  it('should find the heroes shared by at least two factions', () => {
    const sides = [
      side(['grell/hero/marv', 'grell/hero/mera', 'grell/hero/vynthra']),
      side(['protectorate/hero/marv', 'protectorate/hero/mera', 'protectorate/hero/prefect-aster']),
      { kind: 'mercenary' as const, heroIds: ['marran/hero/prefect-aster'] },
    ];

    expect(getCommonHeroIds(protectorate.heroIds, sides)).toEqual(['protectorate/hero/marv', 'protectorate/hero/mera']);
  });

  it('should list faction, common then mercenary heroes', () => {
    expect(getHeroPool(protectorate, marran, resolveRules('protectorate'))).toEqual([
      { heroId: 'protectorate/hero/prefect-aster', origin: 'faction' },
      { heroId: 'protectorate/hero/marv', origin: 'common' },
      { heroId: 'protectorate/hero/mera', origin: 'common' },
      { heroId: 'marran/hero/hel', origin: 'mercenary' },
    ]);
  });

  it('should leave the mercenary hero out when the rule excludes it', () => {
    const pool = getHeroPool(protectorate, marran, resolveRules('the-legion'));

    expect(pool.map(({ origin }) => origin)).not.toContain('mercenary');
  });

  it('should list only faction heroes without mercenary', () => {
    expect(getHeroPool(protectorate, null, resolveRules('protectorate'))).toHaveLength(3);
  });

  it('should pick the first faction hero by default', () => {
    expect(getDefaultHeroId(getHeroPool(protectorate, marran, resolveRules('protectorate')))).toBe(
      'protectorate/hero/prefect-aster',
    );
  });

  it('should pick the first hero of the pool when no hero comes from the faction', () => {
    const commonOnly = side(['protectorate/hero/marv'], ['protectorate/hero/marv']);

    expect(getDefaultHeroId(getHeroPool(commonOnly, marran, resolveRules('protectorate')))).toBe('protectorate/hero/marv');
  });

  it('should have no default hero when the pool is empty', () => {
    expect(getDefaultHeroId([])).toBeNull();
  });
});
