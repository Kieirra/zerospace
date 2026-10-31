import { formatDps, formatNumber, formatOptionalDistance, formatOptionalNumber, formatOptionalSeconds, keepFilledTiles } from '../../wiki.helpers.ts';
import type { Weapon } from '../../wiki.types.ts';

export const toWeaponTiles = (weapon: Weapon) =>
  keepFilledTiles([
    { label: 'Damage', value: formatOptionalNumber(weapon.damage) },
    { label: 'DPS', value: formatDps(weapon), isAccent: true },
    { label: 'Range', value: formatOptionalDistance(weapon.range) },
    { label: 'Cooldown', value: formatOptionalSeconds(weapon.cooldown) },
    { label: 'Burst', value: weapon.burst !== undefined && weapon.burst > 1 ? formatOptionalNumber(weapon.burst) : undefined },
    { label: 'Warmup', value: formatOptionalSeconds(weapon.warmup) },
    { label: 'Projectile speed', value: formatOptionalNumber(weapon.projectileSpeed) },
    ...(weapon.bonuses ?? []).map(({ vs, value, unit }) => ({
      label: `vs ${vs}`,
      value: `${value > 0 ? '+' : ''}${formatNumber(value)}${unit ?? ''}`,
    })),
  ]);
