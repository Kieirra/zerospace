import { describe, expect, it } from 'vitest';
import { createSimulationContext } from '../engine/engine.ts';
import { getCatalogWithMisc, toBuild } from '../engine/engine.wiki-fixtures.ts';
import { toPaletteTabs, toTileLabel } from './action-palette.helpers.ts';
import type { Build } from '../build-order.types.ts';

const GUARDS = 'misc/event/tower-xp-creeps';
const EFFICIENT_UPGRADES = 'the-legion/talent/efficient-upgrades';
const OUTPOST = 'free-corsairs/building/free-corsair-mercenary-outpost';

// Faction + mercenary entities with their Misc steps, as the editor loads them.
const miscTabOf = (build: Build) => {
  const mercenary = build.mercenaryId === null ? null : getCatalogWithMisc(build.mercenaryId);
  const context = createSimulationContext(build, getCatalogWithMisc(build.factionId), mercenary);
  const tabs = toPaletteTabs(build, context);
  return { tabs, misc: tabs.find(({ id }) => id === 'misc')?.tiles ?? [] };
};

const tileOf = (tiles: ReturnType<typeof miscTabOf>['misc'], entityId: string) => {
  const tile = tiles.find(({ entity }) => entity.id === entityId);
  if (!tile) throw new Error(`No tile ${entityId}`);
  return tile;
};

describe('Palette: Misc tab (US-008)', () => {
  it('should list the faction talents by level, then the mercenary talents, then the events (CA1)', () => {
    const { tabs, misc } = miscTabOf(toBuild('the-legion', 'arandi', []));

    expect(tabs.map(({ label }) => label).at(-1)).toBe('Misc');
    expect(misc.map(({ entity }) => entity.name)).toEqual([
      'Improved Conduits',
      'Efficient Upgrades',
      'Unending Army',
      'Lore of Flux',
      'Tower XP creeps',
    ]);
  });

  it('should offer the Reinforcements to the Protectorate only, after the guards', () => {
    const { misc } = miscTabOf(toBuild('protectorate', 'marran', []));

    expect(misc.map(({ entity }) => entity.name)).toEqual([
      'Tower XP creeps',
      'Reinforcements · 6 Commando',
      'Reinforcements · 3 Bastion',
      'Reinforcements · 2 Sentinel',
    ]);
    expect(misc.map(({ entity }) => entity.effectLines?.join(', ')).slice(1)).toEqual([
      '6 Commando, 12 supply',
      '3 Bastion, 9 supply',
      '2 Sentinel, 6 supply',
    ]);
  });

  it('should read the level and the effects in the label of a card', () => {
    const { misc } = miscTabOf(toBuild('the-legion', 'arandi', []));

    expect(toTileLabel(tileOf(misc, 'arandi/talent/lore-of-flux'))).toBe('Add Lore of Flux, Level 2, +3 Harvesters, +10% Flux income');
    expect(toTileLabel(tileOf(misc, EFFICIENT_UPGRADES))).toBe('Add Efficient Upgrades, Level 2, +40% research speed, -40% research cost');
  });

  it('should disable a talent already in the build and keep the guards card active', () => {
    const { misc } = miscTabOf(toBuild('the-legion', 'arandi', [[EFFICIENT_UPGRADES, 60], ...Array<[string, number]>(4).fill([GUARDS, 90])]));

    expect(tileOf(misc, EFFICIENT_UPGRADES)).toMatchObject({ status: 'in-build', disabledReason: 'Already in the build.' });
    expect(tileOf(misc, GUARDS)).toMatchObject({ status: 'available', disabledReason: null });
  });

  it('should allow 3 Outposts when Entrenched Hideouts is in the build', () => {
    const outposts = (count: number): [string, number][] => Array<[string, number]>(count).fill([OUTPOST, 10]);
    const outpostReason = (build: Build) => {
      const { tabs } = miscTabOf(build);
      return tabs.flatMap(({ tiles }) => tiles).find(({ entity }) => entity.id === OUTPOST)?.disabledReason;
    };

    expect(outpostReason(toBuild('the-legion', 'free-corsairs', outposts(1)))).toBe('Only one per match.');
    expect(outpostReason(toBuild('the-legion', 'free-corsairs', [['free-corsairs/talent/entrenched-hideouts', 5], ...outposts(2)]))).toBeNull();
    expect(outpostReason(toBuild('the-legion', 'free-corsairs', [['free-corsairs/talent/entrenched-hideouts', 5], ...outposts(3)]))).toBe(
      'Only 3 per match.',
    );
  });
});
