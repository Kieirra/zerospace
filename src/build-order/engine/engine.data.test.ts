import { describe, expect, it } from 'vitest';
import { toStepKind } from '../build-order.helpers.ts';
import { getCatalog, sideFiles, simulateReal as simulate, toBuild } from './engine.wiki-fixtures.ts';
import type { Build, BuildEntity } from '../build-order.types.ts';

const SUPPLY_PLATFORM = 'protectorate/building/supply-platform';

// One prospector only: its Flux comes slower than the Sentinels are queued.
describe('Simulation on the real Protectorate data', () => {
  const result = simulate(
    toBuild(
      'protectorate',
      null,
      [[SUPPLY_PLATFORM, 0], ['protectorate/building/barracks', 15], ['protectorate/building/research-lab', 55]],
      [
        'protectorate/unit/prospector',
        'protectorate/unit/commando',
        'protectorate/unit/commando',
        'protectorate/unit/sentinel',
        'protectorate/unit/sentinel',
      ],
    ),
  );
  const sentinels = result.orders.filter(({ entityId }) => entityId === 'protectorate/unit/sentinel');

  it('should place the opening without error and end in a finite time', () => {
    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(result.endTime).toBeGreaterThan(0);
    expect(Number.isFinite(result.endTime)).toBe(true);
    expect(result.orders.every(({ startAt }) => startAt !== null)).toBe(true);
  });

  it('should queue at least one Sentinel before it can start', () => {
    expect(sentinels.some(({ clickAt, startAt }) => clickAt !== null && startAt !== null && startAt > clickAt)).toBe(true);
  });

  it('should check the supply', () => {
    expect(result.supply.isChecked).toBe(true);
  });
});

// « Triple hero Altar rush » by Mazar (US-205 example): no mercenary, Kraegar picked at match start.
const TRIPLE_HERO_ALTAR_RUSH: Build = {
  ...toBuild(
    'the-legion',
    null,
    [
      ['the-legion/building/idal-conduit', 20],
      ['the-legion/building/barracks', 35],
      ['the-legion/building/bestiary', 40],
      ['the-legion/building/citadel', 90],
      ['the-legion/building/altar', 140],
      ['the-legion/building/idal-conduit', 150],
      ['the-legion/building/idal-conduit', 160],
    ],
    [
      ...Array<string>(4).fill('the-legion/unit/legion-labourer'),
      'the-legion/unit/steelsworn',
      'the-legion/unit/steelsworn',
      'the-legion/unit/exalted',
      'the-legion/unit/exalted',
      'the-legion/unit/mammoth',
      'the-legion/hero/inquisitress',
      'the-legion/hero/galavax',
    ],
  ),
  heroId: 'the-legion/hero/kraegar',
};

describe('Simulation of the real Legion example « Triple hero Altar rush »', () => {
  it('should place the three heroes without error', () => {
    const result = simulate(TRIPLE_HERO_ALTAR_RUSH);

    expect(result.diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
    expect(result.orders.every(({ endAt }) => endAt !== null)).toBe(true);
    expect(result.supply.used).toBe(44);
  });
});

// Entities the data leaves without build time or producer (US-201 QA): one step each must not break the engine.
const PRODUCED_CATEGORIES: BuildEntity['category'][] = ['unit', 'harvester', 'mercenary-unit'];

const isProblematic = (entity: BuildEntity) =>
  entity.kind !== 'hero' &&
  (entity.duration === null || (PRODUCED_CATEGORIES.includes(entity.category) && entity.producedBy.length === 0));

const problematic = sideFiles.flatMap((sideFile) =>
  getCatalog(sideFile.id)
    .entities.filter(isProblematic)
    .map((entity) => ({ entity, isMercenary: sideFile.kind === 'mercenary' })),
);

// A building or an upgrade is timed at 0:00, a unit is queued.
const toSingleStepBuild = (entity: BuildEntity, isMercenary: boolean) => {
  const [factionId, mercenaryId] = isMercenary ? ['protectorate', entity.sideId] : [entity.sideId, null];
  return toStepKind(entity) === 'timed' ? toBuild(factionId, mercenaryId, [[entity.id, 0]]) : toBuild(factionId, mercenaryId, [], [entity.id]);
};

describe('Simulation of entities with unknown data', () => {
  it('should find the entities reported by the QA', () => {
    const ids = problematic.map(({ entity }) => entity.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'the-xol/unit/roller',
        'the-xol/unit/aegis',
        'grell/unit/seedling',
        'grell/unit/arkanid',
        'valkaru/unit/valkaru-beast',
        'the-legion/upgrade/command-module',
        'the-xol/upgrade/molten-roller',
      ]),
    );
  });

  it.each(problematic.map(({ entity, isMercenary }) => [entity.id, entity, isMercenary] as const))(
    'should simulate %s with a warning',
    (_, entity, isMercenary) => {
      const result = simulate(toSingleStepBuild(entity, isMercenary));
      const codes = result.steps[0].diagnostics.map(({ code }) => code);

      expect(result.steps).toHaveLength(1);
      if (entity.duration === null) expect(codes).toContain('unknown-duration');
      if (entity.producedBy.length === 0 && entity.kind === 'unit' && !isMercenary) {
        expect(codes).toContain('unknown-producer');
      }
      expect(result.samples.length).toBeGreaterThan(0);
    },
  );
});

// PO4, Mazar 2026-11-14: 200 for every faction.
describe('Supply cap on the real data', () => {
  it('should never give more than 200 supply, whatever the supply buildings', () => {
    const platforms = Array.from({ length: 20 }, (_, index): [string, number] => [SUPPLY_PLATFORM, index * 5]);
    const result = simulate(toBuild('protectorate', null, platforms));

    expect(result.supply.cap).toBe(200);
    expect(Math.max(...result.samples.map(({ supplyCap }) => supplyCap ?? 0))).toBe(200);
  });
});
