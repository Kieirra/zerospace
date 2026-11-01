import { TABS } from './wiki.constants.ts';
import type { CostSegment, DescriptionValues, Entity, EntityKind, StatTile, Weapon } from './wiki.types.ts';

const DISTANCE_SCALE = 100;
const VARIABLE_PATTERN = /\{([^{}]+)\}/g;
const RESOURCES: CostSegment['resource'][] = ['hexite', 'flux'];

export const formatNumber = (value: number) => String(Number(value.toFixed(2)));

export const formatDistance = (value: number) => formatNumber(value / DISTANCE_SCALE);

export const formatOptionalNumber = (value?: number) => (value === undefined ? undefined : formatNumber(value));

export const formatOptionalSeconds = (value?: number) => (value === undefined ? undefined : `${formatNumber(value)}s`);

export const formatOptionalDistance = (value?: number) => (value === undefined ? undefined : formatDistance(value));

export const computeDps = ({ damage, cooldown, burst = 1, burstCooldown = cooldown }: Weapon) => {
  if (damage === undefined || cooldown === undefined || burstCooldown === undefined) return undefined;
  const cycle = (burst - 1) * cooldown + burstCooldown;
  return cycle > 0 ? (damage * burst) / cycle : undefined;
};

// The game's GetWeaponDPS value (extracted as `dps`) wins; the formula is only a fallback.
export const formatDps = (weapon: Weapon) => {
  const dps = weapon.dps ?? computeDps(weapon);
  return dps === undefined ? undefined : String(Number(dps.toFixed(1)));
};

export const interpolate = (text: string, values?: DescriptionValues) =>
  text.replace(VARIABLE_PATTERN, (variable, key: string) => {
    const value = values?.[key];
    if (value === undefined) return variable;
    if (typeof value === 'string') return value;
    return Array.isArray(value) ? value.map(formatNumber).join('/') : formatNumber(value);
  });

export const formatCost = (cost?: Entity['cost'], divisor = 1) => {
  const segments = RESOURCES.flatMap((resource): CostSegment[] => {
    const amount = cost?.[resource];
    return amount ? [{ amount: String(Math.round(amount / divisor)), resource }] : [];
  });
  return segments.length > 0 ? segments : undefined;
};

export const formatUnitCost = ({ cost, count = 1 }: Entity) => formatCost(cost, count);

export const formatArmor = ({ armor, armorType }: { armor?: number; armorType?: string }) =>
  [formatOptionalNumber(armor), armorType && capitalize(armorType)].filter(Boolean).join(' ') || undefined;

export const keepFilledTiles = (tiles: (Omit<StatTile, 'value'> & { value?: StatTile['value'] })[]) =>
  tiles.filter((tile): tile is StatTile => tile.value !== undefined);

export const toGameStatTiles = (stats: LabeledValue[] = []) =>
  stats.map(({ label, value, unit = '', levels }) => ({
    label,
    value: `${[value].flat().map(formatNumber).join('/')}${unit}`,
    levels:
      Array.isArray(value) && levels?.length === value.length
        ? value.map((levelValue, index) => ({ level: levels[index], value: `${formatNumber(levelValue)}${unit}` }))
        : undefined,
  }));

// Main income of a base or harvester: the first per-minute figure of a resource.
export const formatIncome = ({ economy = [] }: Entity) => {
  const income = economy.find(({ label, unit }) => unit === '/min' && toLabelResource(label));
  const resource = income && toLabelResource(income.label);
  if (!income || !resource) return undefined;
  return [{ amount: formatNumber([income.value].flat()[0]), resource, suffix: '/min' }] satisfies CostSegment[];
};

export const toLabelResource = (label: string) => RESOURCES.find((resource) => new RegExp(`\\b${resource}\\b`, 'i').test(label));

// "Biological, Not Mechanical": targets the weapon or heal reaches, excluded ones prefixed with Not.
export const formatTargets = ({ targets = [], excludedTargets = [] }: { targets?: string[]; excludedTargets?: string[] }) =>
  [...targets, ...excludedTargets.map((target) => `Not ${target}`)].join(', ') || undefined;

export const formatEnergyCost = (energyCost: Entity['energyCost']) => {
  if (energyCost === undefined) return undefined;
  return typeof energyCost === 'number' ? formatNumber(energyCost) : 'per target';
};

export const entityHref = (id: string) => `/wiki/${id}`;

export const tabHref = (factionId: string, tabSlug: string) => `/wiki/${factionId}/${tabSlug}`;

export const kindTabHref = (factionId: string, kind: EntityKind) =>
  tabHref(factionId, TABS.find((tab) => tab.kind === kind)?.slug ?? TABS[0].slug);

export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// Display order of the game (`order`, smaller first), entities without order last, then by name.
export const byOrderThenName = (a: Ordered, b: Ordered) => toOrderRank(a) - toOrderRank(b) || byName(a, b);

export const byTierThenOrder = (a: Entity, b: Entity) => toTierRank(a) - toTierRank(b) || byOrderThenName(a, b);

export const toInitial = (name: string) => name.charAt(0);

export interface EnergyParameters {
  energyCost?: number;
  unitCostMultiplier?: number;
  fluxWeight?: number;
  structureCostMultiplier?: number;
  supplyCostMultiplier?: number;
  base?: number;
  hero?: number;
  massive?: number;
}

const ENERGY_RULES: [keyof EnergyParameters, (value: string) => string][] = [
  ['energyCost', (value) => `Energy cost ${value}`],
  ['unitCostMultiplier', (value) => `Unit cost × ${value}`],
  ['fluxWeight', (value) => `Flux counts × ${value}`],
  ['structureCostMultiplier', (value) => `Structures: cost × ${value}`],
  ['supplyCostMultiplier', (value) => `Supply × ${value}`],
  ['base', (value) => `+ ${value}`],
  ['hero', (value) => `Heroes: ${value}`],
  ['massive', (value) => `Massive units: ${value}`],
];

export const describeEnergyCost = (parameters: EnergyParameters) =>
  ENERGY_RULES.flatMap(([key, describe]) => {
    const value = parameters[key];
    return value === undefined ? [] : [describe(formatNumber(value))];
  });

const toTierRank = ({ tier }: Entity) => Number(tier?.match(/\d+/)?.[0] ?? 1);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface LabeledValue {
  label: string;
  value: number | number[];
  unit?: string;
  levels?: number[];
}

interface Ordered {
  name: string;
  order?: number;
}

const toOrderRank = ({ order }: Ordered) => order ?? Number.MAX_SAFE_INTEGER;
