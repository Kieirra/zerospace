import { describe, expect, it } from 'vitest';
import { toBuild, toRealContext } from '../engine/engine.wiki-fixtures.ts';
import { toTileDisabledReason } from './action-palette.helpers.ts';
import type { Build, BuildEntity } from '../build-order.types.ts';

// Reason of the real entity in the build, read with the build's own catalog and rules.
const reasonOf = (build: Build, entityId: string, change: Partial<BuildEntity> = {}) => {
  const { catalog, rules } = toRealContext(build);
  const entity = catalog.get(entityId);
  if (!entity) throw new Error(`Unknown entity ${entityId}`);
  return toTileDisabledReason({ ...entity, ...change }, build, { catalog, rules });
};

const protectorate = (timed: [string, number][] = [], queued: string[] = []) => toBuild('protectorate', 'marran', timed, queued);

const legion = (queued: string[] = [], heroId: string | null = null) => ({
  ...toBuild('the-legion', null, [['the-legion/building/altar', 1]], queued),
  heroId,
});

const SUPPLY_PLATFORM: [string, number] = ['protectorate/building/supply-platform', 1];
const BARRACKS: [string, number] = ['protectorate/building/barracks', 1];
const MECHANICAL_LAB: [string, number] = ['protectorate/building/mechanical-research-lab', 1];
const SENTINEL = 'protectorate/unit/sentinel';

describe('toTileDisabledReason: producer', () => {
  it('should say the producer is unknown for a unit made by nothing in the data', () => {
    expect(reasonOf(protectorate(), 'protectorate/hero/prefect-aster')).toBe('Producer unknown in the game data.');
  });

  it('should ask for a Barracks first for a Barracks unit in a build without Barracks', () => {
    expect(reasonOf(protectorate([SUPPLY_PLATFORM]), SENTINEL)).toBe('Build a Barracks first.');
  });

  it('should join the producers with or', () => {
    const producedBy = ['protectorate/building/barracks', 'protectorate/building/skydock'];

    expect(reasonOf(protectorate(), SENTINEL, { producedBy })).toBe('Build a Barracks or Skydock first.');
  });

  it('should accept the starting base as a producer', () => {
    expect(reasonOf(protectorate(), 'protectorate/unit/prospector')).toBeNull();
  });

  it('should ask for a mercenary building first for its recruit', () => {
    expect(reasonOf(protectorate(), 'marran/unit/marran-badger')).toBe('Build a Marran Bulwark first.');
    expect(reasonOf(protectorate([['marran/building/marran-bulwark', 1]]), 'marran/unit/marran-badger')).toBeNull();
  });
});

describe('toTileDisabledReason: requirements', () => {
  it('should join the alternatives of an any requirement with or', () => {
    expect(reasonOf(protectorate(), 'protectorate/building/barracks')).toBe(
      'Requires Sensor Platform, Supply Platform or Turret Platform.',
    );
  });

  it('should take a transformation of the build as its building', () => {
    const build = protectorate([SUPPLY_PLATFORM, ['protectorate/upgrade/sensor-platform', 2]]);

    expect(reasonOf({ ...build, timed: build.timed.slice(1) }, 'protectorate/building/barracks')).not.toBeNull();
    expect(reasonOf(build, 'protectorate/building/barracks')).toBeNull();
  });

  it('should name only the missing requirements of an all requirement, joined with and', () => {
    const eagle = 'protectorate/upgrade/eagle-tactics';

    expect(reasonOf(protectorate(), eagle)).toBe('Requires Mechanical Research Lab and Research Lab.');
    expect(reasonOf(protectorate([MECHANICAL_LAB]), eagle)).toBe('Requires Research Lab.');
  });

  it('should ask for the producer before the requirement of a unit', () => {
    expect(reasonOf(protectorate([SUPPLY_PLATFORM]), SENTINEL)).not.toMatch(/Requires/);
    expect(reasonOf(protectorate([SUPPLY_PLATFORM, BARRACKS]), SENTINEL)).toBe('Requires Research Lab.');
  });
});

describe('toTileDisabledReason: once per build', () => {
  it('should refuse a research already in the build', () => {
    const build = protectorate([MECHANICAL_LAB, ['protectorate/upgrade/jetpack', 2]]);

    expect(reasonOf(build, 'protectorate/upgrade/jetpack')).toBe('Already in the build.');
  });

  it('should name the research of the same exclusive group already in the build', () => {
    const build = protectorate([MECHANICAL_LAB, ['protectorate/upgrade/jetpack', 2]]);

    expect(reasonOf(build, 'protectorate/upgrade/antimatter-boosters')).toBe('Jetpack is already in the build.');
    expect(reasonOf(build, 'protectorate/upgrade/transport')).toBeNull();
  });

  it('should allow one copy of a mercenary building per match', () => {
    const bulwark = 'marran/building/marran-bulwark';

    expect(reasonOf(protectorate(), bulwark)).toBeNull();
    expect(reasonOf(protectorate([[bulwark, 1]]), bulwark)).toBe('Only one per match.');
  });

  it('should keep a building available more than once', () => {
    expect(reasonOf(protectorate([SUPPLY_PLATFORM, BARRACKS]), 'protectorate/building/barracks')).toBeNull();
  });
});

describe('toTileDisabledReason: Altar heroes', () => {
  it('should ask for the Altar first', () => {
    expect(reasonOf(toBuild('the-legion', null, []), 'the-legion/hero/galavax')).toBe('Build a Altar first.');
  });

  it('should refuse the setup hero and a hero already built', () => {
    const build = legion(['the-legion/hero/inquisitress'], 'the-legion/hero/kraegar');

    expect(reasonOf(build, 'the-legion/hero/kraegar')).toBe('Already picked.');
    expect(reasonOf(build, 'the-legion/hero/inquisitress')).toBe('Already picked.');
    expect(reasonOf(build, 'the-legion/hero/galavax')).toBeNull();
  });

  it('should refuse a third Altar hero: the Legion has 2 paid hero slots', () => {
    const build = legion(['the-legion/hero/inquisitress', 'the-legion/hero/galavax']);

    expect(reasonOf(build, 'the-legion/hero/kraegar')).toBe('No hero slot left: 3 heroes at most.');
  });
});
