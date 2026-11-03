import {
  formatDps,
  formatNumber,
  formatOptionalDistance,
  formatOptionalNumber,
  formatOptionalSeconds,
  formatTargets,
  keepFilledTiles,
} from '../../wiki.helpers.ts';
import type { Weapon } from '../../wiki.types.ts';

export const isHealWeapon = ({ kind }: Weapon) => kind === 'heal';

export const toWeaponTiles = (weapon: Weapon) =>
  keepFilledTiles([
    ...(isHealWeapon(weapon)
      ? [
          { label: 'Heal', value: formatOptionalNumber(weapon.damage), isHeal: true },
          { label: 'HPS', value: formatDps(weapon), isHeal: true },
        ]
      : [
          { label: 'Damage', value: formatOptionalNumber(weapon.damage) },
          { label: 'DPS', value: formatDps(weapon), isAccent: true },
        ]),
    { label: 'Range', value: formatOptionalDistance(weapon.range) },
    { label: 'Minimum range', value: formatOptionalDistance(weapon.minRange) },
    { label: 'Splash radius', value: formatOptionalDistance(weapon.splashRadius) },
    {
      label: 'Splash damage',
      value: weapon.splashDamage === undefined ? undefined : `${formatNumber(weapon.splashDamage)}%`,
      patchNote: weapon.patchNotes?.splashDamage,
    },
    { label: 'Cooldown', value: formatOptionalSeconds(toFirePeriod(weapon)) },
    { label: 'Burst', value: isBurst(weapon) ? formatOptionalNumber(weapon.burst) : undefined },
    { label: 'Burst cooldown', value: isBurst(weapon) ? formatOptionalSeconds(weapon.burstCooldown) : undefined },
    { label: 'Warmup', value: formatOptionalSeconds(weapon.warmup) },
    { label: 'Projectile speed', value: formatOptionalNumber(weapon.projectileSpeed) },
    { label: 'Targets', value: formatTargets(weapon), isHeal: isHealWeapon(weapon) },
    ...(weapon.bonuses ?? []).map(({ vs, value, unit }) => ({
      label: `vs ${vs}`,
      value: `${value > 0 ? '+' : ''}${formatNumber(value)}${unit ?? ''}`,
    })),
  ]);

const isBurst = ({ burst }: Weapon) => burst !== undefined && burst > 1;

// Like the game's GetWeaponDPS: without burst, cooldown is ignored and burstCooldown is the time between two shots.
const toFirePeriod = (weapon: Weapon) => (isBurst(weapon) ? weapon.cooldown : (weapon.burstCooldown ?? weapon.cooldown));
