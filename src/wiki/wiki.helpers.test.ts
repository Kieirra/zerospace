import { describe, expect, it } from 'vitest';
import {
  byTierThenName,
  formatDistance,
  formatDps,
  formatIncome,
  formatNumber,
  formatUnitCost,
  interpolate,
  toGameStatTiles,
} from './wiki.helpers.ts';
import type { Entity, GameStat } from './wiki.types.ts';

describe('Wiki display rules', () => {
  it('should keep at most two decimals without trailing zeros when formatting a number', () => {
    expect(formatNumber(3.2813)).toBe('3.28');
    expect(formatNumber(1.25)).toBe('1.25');
    expect(formatNumber(10)).toBe('10');
  });

  it('should show 9.2 when computing the Stinger DPS', () => {
    const feralClaws = { damage: 6, cooldown: 0.65, burst: 1, burstCooldown: 0.65 };

    expect(formatDps(feralClaws)).toBe('9.2');
  });

  it('should show the game dps when the weapon provides it', () => {
    const truthbringer = { damage: 38, burst: 1, burstCooldown: 0.9, range: 1200, dps: 42.2222 };

    expect(formatDps(truthbringer)).toBe('42.2');
  });

  it('should include the burst cycle when the weapon fires several shots', () => {
    const weapon = { damage: 10, cooldown: 0.2, burst: 3, burstCooldown: 1.6 };

    expect(formatDps(weapon)).toBe('15');
  });

  it('should round the cost of one unit to the nearest integer when units are produced in batches', () => {
    const skrell: Entity = { id: 'grell/unit/skrell', kind: 'unit', faction: 'grell', name: 'Skrell', cost: { hexite: 50, flux: 50 }, count: 3 };
    const lasher: Entity = { id: 'grell/unit/lasher', kind: 'unit', faction: 'grell', name: 'Lasher', cost: { hexite: 100, flux: 25 }, count: 2 };

    expect(formatUnitCost(skrell)).toEqual([
      { amount: '17', resource: 'hexite' },
      { amount: '17', resource: 'flux' },
    ]);
    expect(formatUnitCost(lasher)).toEqual([
      { amount: '50', resource: 'hexite' },
      { amount: '13', resource: 'flux' },
    ]);
  });

  it('should append the unit and join per level values when showing game stats', () => {
    const stats: GameStat[] = [
      { label: 'Attack speed', value: 40, unit: '%' },
      { label: 'Damage', value: [10, 20, 30] },
    ];

    expect(toGameStatTiles(stats)).toEqual([
      { label: 'Attack speed', value: '40%', levels: undefined },
      { label: 'Damage', value: '10/20/30', levels: undefined },
    ]);
  });

  it('should label each value with its level when the game stat gives the levels', () => {
    const infusionDamage: GameStat = { label: 'Damage', value: [45, 90], unit: '%', levels: [1, 2] };

    expect(toGameStatTiles([infusionDamage])[0].levels).toEqual([
      { level: 1, value: '45%' },
      { level: 2, value: '90%' },
    ]);
  });

  it('should divide by 100 when formatting a range or a vision', () => {
    expect(formatDistance(100)).toBe('1');
    expect(formatDistance(1600)).toBe('16');
    expect(formatDistance(575)).toBe('5.75');
  });

  it('should replace variables with their values when the description has values', () => {
    const description = 'The targeted unit gains +{attackspeed}% attack speed and +{movespeed}% move speed.';

    expect(interpolate(description, { attackspeed: 40, movespeed: 15 })).toBe(
      'The targeted unit gains +40% attack speed and +15% move speed.',
    );
  });

  it('should join per level values with slashes when a value is an array', () => {
    expect(interpolate('Deals {Damage} damage.', { Damage: [10, 20, 30, 40] })).toBe('Deals 10/20/30/40 damage.');
  });

  it('should insert the text when a value is a game name', () => {
    expect(interpolate('Reduce {teleportname} cooldown.', { teleportname: 'Teleport' })).toBe('Reduce Teleport cooldown.');
  });

  it('should keep the variable visible when its value is missing', () => {
    expect(interpolate('A {nest} spawns {Spiderling}s.', { Spiderling: 2 })).toBe('A {nest} spawns 2s.');
    expect(interpolate('A {nest} appears.')).toBe('A {nest} appears.');
  });

  it('should list untiered and T1 upgrades first, then higher tiers, then names when sorting upgrades', () => {
    const upgrade = (name: string, tier?: string): Entity => ({ id: name, kind: 'upgrade', faction: 'grell', name, tier });
    const upgrades = [upgrade('Volatile', 'T3'), upgrade('Camouflage', 'T2'), upgrade('Tunnel'), upgrade('Armor', 'T1')];

    expect(upgrades.sort(byTierThenName).map(({ name }) => name)).toEqual(['Armor', 'Tunnel', 'Camouflage', 'Volatile']);
  });

  it('should take the first per-minute figure of a resource as the income of a base', () => {
    const operatingTower: Entity = {
      id: 'protectorate/building/operating-tower',
      kind: 'building',
      faction: 'protectorate',
      name: 'Operating Tower',
      economy: [
        { label: 'Workers', value: 6 },
        { label: 'Hexite / min', value: 336, unit: '/min' },
        { label: 'Hexite / min (rich)', value: 504, unit: '/min' },
      ],
    };

    expect(formatIncome(operatingTower)).toEqual([{ amount: '336', resource: 'hexite', suffix: '/min' }]);
  });
});
