import { describe, expect, it } from 'vitest';
import { toBuild, toRealContext } from '../engine/engine.wiki-fixtures.ts';
import {
  filterTiles,
  findTileByHotkey,
  toDefaultTabId,
  toPaletteTabs,
  toResearchOrder,
  toTileDisabledReason,
  toTileLabel,
} from './action-palette.helpers.ts';
import type { Build, BuildCatalog, BuildEntity } from '../build-order.types.ts';
import type { PaletteContext, PaletteTab, PaletteTabId, PaletteTileData } from './action-palette.helpers.ts';

const toContext = (build: Build): PaletteContext => {
  const { catalog, rules, startingBuildingId } = toRealContext(build);
  return { catalog, rules, startingBuildingId };
};

const protectorate = (timed: [string, number][] = [], queued: string[] = [], mercenaryId: string | null = 'marran') =>
  toBuild('protectorate', mercenaryId, timed, queued);

const legion = (timed: [string, number][] = [], queued: string[] = []) => ({
  ...toBuild('the-legion', null, timed, queued),
  heroId: 'the-legion/hero/kraegar',
});

const tabsOf = (build: Build) => toPaletteTabs(build, toContext(build));

const tileIds = (tab: PaletteTab | undefined) => tab?.tiles.map(({ entity }) => entity.id) ?? [];

const tabOf = (tabs: PaletteTab[], id: PaletteTab['id']) => tabs.find((tab) => tab.id === id);

const heroTilesOf = (tabs: PaletteTab[]) => tabOf(tabs, 'units')?.tiles.filter(({ entity }) => entity.category === 'hero') ?? [];

const SUPPLY_PLATFORM: [string, number] = ['protectorate/building/supply-platform', 1];
const ALTAR: [string, number] = ['the-legion/building/altar', 1];

describe('Palette: tabs', () => {
  it('should give Buildings, Units, Research and the mercenary tab, without hero outside the Legion', () => {
    const tabs = tabsOf(protectorate());

    expect(tabs.map(({ label }) => label)).toEqual(['Buildings', 'Units', 'Research', 'Merc']);
    expect(tileIds(tabOf(tabs, 'units'))).toContain('protectorate/unit/prospector');
    expect(heroTilesOf(tabs)).toEqual([]);
    expect(tileIds(tabOf(tabs, 'research'))).toContain('protectorate/upgrade/sensor-platform');
    expect(tileIds(tabOf(tabs, 'mercenary'))).toContain('marran/building/marran-bulwark');
  });

  it('should hide the building variants and sort by game order', () => {
    const buildings = tileIds(tabOf(tabsOf(protectorate()), 'buildings'));

    expect(buildings).not.toContain('protectorate/building/sensor-platform');
    expect(buildings.slice(0, 3)).toEqual([
      'protectorate/building/operating-tower',
      'protectorate/building/supply-platform',
      'protectorate/building/barracks',
    ]);
  });

  it('should drop the mercenary tab without mercenary', () => {
    expect(tabsOf(protectorate([], [], null)).map(({ id }) => id)).toEqual(['buildings', 'units', 'research']);
  });

  it('should put the Altar heroes after the units for the Legion, without a Heroes tab (Kieirra 2026-11-19)', () => {
    const tabs = tabsOf(legion([ALTAR], ['the-legion/hero/inquisitress']));
    const units = tabOf(tabs, 'units')?.tiles ?? [];

    expect(tabs.map(({ label }) => label)).toEqual(['Buildings', 'Units', 'Research']);
    expect(units.slice(-3).map(({ entity, status }) => [entity.name, status])).toEqual([
      ['Inquisitress', 'in-build'],
      ['Kraegar', 'free-setup'],
      ['Galavax', 'available'],
    ]);
  });

  it('should lead the Units tab with what the starting building makes when the faction is Protectorate (Kieirra 2026-11-19)', () => {
    const units = tileIds(tabOf(tabsOf(protectorate()), 'units'));

    expect(units.slice(0, 2)).toEqual(['protectorate/unit/prospector', 'protectorate/unit/recon-drone']);
  });

  it('should lead the Units tab with what the starting building makes when the faction is the Legion', () => {
    const units = tileIds(tabOf(tabsOf(legion()), 'units'));

    expect(units.slice(0, 2)).toEqual(['the-legion/unit/legion-labourer', 'the-legion/unit/scouting-drone']);
  });

  it('should mark a research already in the build', () => {
    const build = protectorate([['protectorate/building/mechanical-research-lab', 1], ['protectorate/upgrade/jetpack', 2]]);
    const research = tabOf(tabsOf(build), 'research');

    expect(research?.tiles.find(({ entity }) => entity.id === 'protectorate/upgrade/jetpack')?.status).toBe('in-build');
  });

  it('should start an empty build on the Units tab, any step on the Buildings tab', () => {
    expect(toDefaultTabId(protectorate())).toBe('units');
    expect(toDefaultTabId(protectorate([], ['protectorate/unit/prospector']))).toBe('buildings');
    expect(toDefaultTabId(protectorate([SUPPLY_PLATFORM]))).toBe('buildings');
  });
});

describe('Palette: search', () => {
  it('should find names without case or accents, in every tab', () => {
    const tabs = tabsOf(protectorate());
    const accented = tabs.map((tab) => ({
      ...tab,
      tiles: tab.tiles.map((tile) => ({ ...tile, entity: { ...tile.entity, displayName: tile.entity.displayName.replace('Barracks', 'Bàrracks') } })),
    }));

    expect(filterTiles(accented, 'BARRA').map(({ id, tiles }) => [id, tiles.map(({ entity }) => entity.name)])).toEqual([
      ['buildings', ['Barracks']],
    ]);
    expect(filterTiles(tabs, 'zzz')).toEqual([]);
  });
});

describe('Palette: hotkeys', () => {
  it('should find the tile of the active tab, the first one when two share the hotkey', () => {
    const tabs = tabsOf(protectorate([SUPPLY_PLATFORM]));
    const buildings = tabOf(tabs, 'buildings')?.tiles ?? [];
    const doubled = [...buildings, { ...buildings[2], entity: { ...buildings[2].entity, id: 'copy' } }];

    expect(findTileByHotkey(doubled, 'd')?.entity.id).toBe('protectorate/building/barracks');
    expect(findTileByHotkey(buildings, 'H')).toBeUndefined();
    expect(findTileByHotkey(tabOf(tabs, 'units')?.tiles ?? [], 'h')?.entity.id).toBe('protectorate/unit/prospector');
  });

  it('should skip a disabled tile', () => {
    const buildings = tabOf(tabsOf(protectorate()), 'buildings')?.tiles ?? [];

    expect(buildings[2].disabledReason).not.toBeNull();
    expect(findTileByHotkey(buildings, 'd')).toBeUndefined();
  });

  it('should never add the setup hero by its hotkey', () => {
    const heroes = heroTilesOf(tabsOf(legion([ALTAR])));

    expect(findTileByHotkey(heroes, 'S')).toBeUndefined();
    expect(findTileByHotkey(heroes, 'A')?.entity.name).toBe('Inquisitress');
  });

  it('should describe a tile for screen readers, with why it is disabled', () => {
    const buildings = tabOf(tabsOf(protectorate()), 'buildings')?.tiles ?? [];

    expect(toTileLabel(buildings[2])).toBe(
      'Add Barracks, 75 Hexite, 0:35, hotkey D, Requires Sensor Platform, Supply Platform or Turret Platform.',
    );
  });
});

describe('Palette: real data', () => {
  it('should add the first research in game order when two research tiles share a hotkey', () => {
    const research = tabOf(tabsOf(protectorate()), 'research')?.tiles ?? [];

    expect(findTileByHotkey(research, 'e')?.entity.id).toBe('protectorate/upgrade/turret-platform');
  });

  it('should disable a Barracks unit until a Barracks is in the build', () => {
    const sentinelOf = (build: Build) =>
      tabOf(tabsOf(build), 'units')?.tiles.find(({ entity }) => entity.id === 'protectorate/unit/sentinel')?.disabledReason;

    expect(sentinelOf(protectorate([SUPPLY_PLATFORM]))).toBe('Build a Barracks first.');
    expect(sentinelOf(protectorate([SUPPLY_PLATFORM, ['protectorate/building/barracks', 1]]))).toBe('Requires Research Lab.');
    expect(
      sentinelOf(protectorate([SUPPLY_PLATFORM, ['protectorate/building/barracks', 1], ['protectorate/building/research-lab', 1]])),
    ).toBeNull();
  });

  it('should disable every tile once the build holds 200 steps', () => {
    const full = protectorate(Array.from({ length: 200 }, (_, index): [string, number] => ['protectorate/building/supply-platform', index]));
    const context = toContext(full);
    const barracks = context.catalog.get('protectorate/building/barracks');

    expect(barracks && toTileDisabledReason(barracks, full, context)).toBe('Build is full: 200 steps at most.');
    expect(findTileByHotkey(tabOf(tabsOf(full), 'units')?.tiles ?? [], 'h')).toBeUndefined();
  });

  it('should name the supply a unit takes, and none for a building (Mazar 2026-11-17)', () => {
    const tabs = tabsOf(protectorate());
    const labelOf = (tabId: PaletteTabId, entityId: string) => {
      const tile = tabOf(tabs, tabId)?.tiles.find(({ entity }) => entity.id === entityId);
      return tile && toTileLabel(tile);
    };

    expect(labelOf('units', 'protectorate/unit/sentinel')).toMatch(/Hexite, .*\d+ supply, /);
    expect(labelOf('buildings', 'protectorate/building/barracks')).not.toMatch(/supply/);
  });
});

describe('Palette: research order (Kieirra 2026-11-19)', () => {
  const entity = (id: string, fields: Partial<BuildEntity> = {}) =>
    ({ id, name: id, kind: 'upgrade', category: 'research', requires: [], appliesTo: [], ...fields }) as BuildEntity;
  const CATALOG: BuildCatalog = new Map(
    [
      entity('lab', { kind: 'building', category: 'building', order: 20 }),
      entity('forge', { kind: 'building', category: 'building', order: 10 }),
      entity('tower', { kind: 'building', category: 'building', order: 30 }),
      entity('tank', { kind: 'unit', category: 'unit', order: 2 }),
      entity('scout', { kind: 'unit', category: 'unit', order: 1 }),
    ].map((item) => [item.id, item]),
  );
  const tile = (item: BuildEntity): PaletteTileData => ({ entity: item, disabledReason: null, status: 'available' });
  const orderOf = (items: BuildEntity[]) => toResearchOrder(items.map(tile), CATALOG).map(({ entity: { id } }) => id);

  it('should group by the first required building, in the Buildings order, then by upgraded entity, tier and name', () => {
    const items = [
      entity('tank-2', { requires: ['tank', 'lab'], appliesTo: ['tank'], order: 1 }),
      entity('tank-1', { requires: ['lab', 'forge'], appliesTo: ['tank'], order: 0 }),
      entity('scout-1', { requires: ['lab'], appliesTo: ['scout'], order: 0 }),
      entity('forge-b', { requires: ['forge'] }),
      entity('forge-a', { requires: ['forge'] }),
    ];

    expect(orderOf(items)).toEqual(['forge-a', 'forge-b', 'scout-1', 'tank-1', 'tank-2']);
  });

  it('should put a transformation after the research of the building it transforms, unknown ones and research without building last', () => {
    const items = [
      entity('no-building', { appliesTo: ['scout'] }),
      entity('lost-turret', { category: 'transformation', appliesTo: ['unknown'] }),
      entity('tower-turret', { category: 'transformation', requires: ['lab'], appliesTo: ['tower'] }),
      entity('forge-turret', { category: 'transformation', appliesTo: ['forge'] }),
      entity('forge-1', { requires: ['forge'], appliesTo: ['scout'] }),
      entity('tower-1', { requires: ['tower'] }),
    ];

    expect(orderOf(items)).toEqual(['forge-1', 'forge-turret', 'tower-1', 'tower-turret', 'no-building', 'lost-turret']);
  });

  it('should keep the order of equal research', () => {
    const twins = [entity('twin-b', { name: 'Twin', requires: ['lab'] }), entity('twin-a', { name: 'Twin', requires: ['lab'] })];

    expect(orderOf(twins)).toEqual(['twin-b', 'twin-a']);
  });

  it('should order the Legion research by Citadel then Armory, without the upgrades done on a unit (real data)', () => {
    const names = tabOf(tabsOf(legion()), 'research')?.tiles.map(({ entity: { name } }) => name) ?? [];

    expect(names.slice(0, 4)).toEqual(['Garrison Tower Turret', 'Battle Frenzy', 'Charged Shot', 'Performance Enhancers']);
    expect(names.indexOf('Ironhide Accord')).toBeLessThan(names.indexOf('Improved Charge'));
    expect(names).not.toContain('Anti-air Missile Turret');
  });
});
