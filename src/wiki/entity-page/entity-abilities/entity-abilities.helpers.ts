import { formatOptionalDistance, formatOptionalNumber, formatOptionalSeconds } from '../../wiki.helpers.ts';
import type { Entity } from '../../wiki.types.ts';

type Ability = NonNullable<Entity['abilities']>[number];

export const buildAbilityMeta = (ability: Ability) =>
  [
    { label: 'Hotkey', value: ability.hotkey },
    { label: 'Cooldown', value: formatOptionalSeconds(ability.cooldown) },
    { label: 'Energy', value: formatOptionalNumber(ability.energyCost) },
    { label: 'Range', value: formatOptionalDistance(ability.range) },
    { label: 'Charges', value: formatOptionalNumber(ability.charges) },
  ].filter((meta): meta is { label: string; value: string } => meta.value !== undefined);
