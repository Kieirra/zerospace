import { describe, expect, it } from 'vitest';
import { toWeaponTiles } from './entity-weapons.helpers.ts';

describe('Weapon tiles', () => {
  it('should show heal and heal per second instead of damage when the weapon heals', () => {
    const tiles = toWeaponTiles({ name: 'Mending Light', kind: 'heal', damage: 8, cooldown: 0.5, targets: ['Biological'] });

    expect(tiles.map(({ label, value }) => `${label} ${value}`)).toEqual(['Heal 8', 'HPS 16', 'Cooldown 0.5s', 'Targets Biological']);
  });

  it('should show excluded targets with Not when the heal reaches everything but them', () => {
    const tiles = toWeaponTiles({ name: 'Support Matrix', kind: 'heal', damage: 11, excludedTargets: ['Biological'] });

    expect(tiles.find(({ label }) => label === 'Targets')).toEqual({ label: 'Targets', value: 'Not Biological', isHeal: true });
  });

  describe('Cooldown', () => {
    const tileValue = (weapon: Parameters<typeof toWeaponTiles>[0], label: string) =>
      toWeaponTiles(weapon).find((tile) => tile.label === label)?.value;

    it('should show the time between two shots, burstCooldown, when the weapon fires single shots', () => {
      const supportMatrix = { name: 'Support Matrix', kind: 'heal' as const, damage: 11, cooldown: 0, burst: 1, burstCooldown: 0.5 };
      const feralClaws = { name: 'Feral Claws', damage: 6, cooldown: 0.65, burst: 1, burstCooldown: 0.65 };

      expect(tileValue(supportMatrix, 'Cooldown')).toBe('0.5s');
      expect(tileValue(feralClaws, 'Cooldown')).toBe('0.65s');
    });

    it('should keep the cooldown between burst shots and add the burst cooldown when the weapon fires bursts', () => {
      const burstGun = { name: 'Burst Gun', damage: 10, cooldown: 0.2, burst: 3, burstCooldown: 1.6 };

      expect(tileValue(burstGun, 'Cooldown')).toBe('0.2s');
      expect(tileValue(burstGun, 'Burst cooldown')).toBe('1.6s');
    });
  });
});
