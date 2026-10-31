import { describe, expect, it } from 'vitest';
import type { Entity } from '../../wiki.types.ts';
import { groupUpgradeRows } from './entity-upgrades.helpers.ts';

const upgrade = (name: string, tier?: string, exclusiveGroup?: string): Entity => ({
  id: name,
  kind: 'upgrade',
  faction: 'grell',
  name,
  tier,
  exclusiveGroup,
});

const toNames = (rows: ReturnType<typeof groupUpgradeRows>) =>
  rows.map(({ isChoice, upgrades }) => ({ isChoice, names: upgrades.map(({ name }) => name) }));

describe('Upgrade rows of an entity', () => {
  it('should pair the upgrades of an exclusive group as one choice when the group mixes tiers', () => {
    const stingerUpgrades = [
      upgrade('Dissolving Venom', 'T3', 'Stinger.Specialize2'),
      upgrade('Extensor Adaptation', 'T1', 'Stinger.Specialize1'),
      upgrade('Pouncing Reflex', undefined, 'Stinger.Specialize2'),
      upgrade('Biomass Submersion', undefined, 'Stinger.Specialize1'),
    ];

    expect(toNames(groupUpgradeRows(stingerUpgrades))).toEqual([
      { isChoice: true, names: ['Biomass Submersion', 'Extensor Adaptation'] },
      { isChoice: true, names: ['Pouncing Reflex', 'Dissolving Venom'] },
    ]);
  });

  it('should group upgrades without exclusive group by tier when they are independent', () => {
    const upgrades = [upgrade('Veterancy', 'T3'), upgrade('Shield Generator'), upgrade('Bomb Bay')];

    expect(toNames(groupUpgradeRows(upgrades))).toEqual([
      { isChoice: false, names: ['Bomb Bay', 'Shield Generator'] },
      { isChoice: false, names: ['Veterancy'] },
    ]);
  });
});
