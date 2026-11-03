import { TABS } from './wiki.constants.ts';
import type { PatchNoteMismatch } from './wiki-data.types.ts';
import type { CostSegment, DescriptionValues, Entity, EntityKind, StatTile, Weapon } from './wiki.types.ts';

const DISTANCE_SCALE = 100;
// A variable with its sign before and its percent after, shown as one value: "+{speed}" → "+250".
const SHOWN_VALUE_PATTERN = /([+-]?)\{([^{}]+)\}(%?)/g;
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

// Text cut around its resolved variables; a variable without value stays visible as plain text.
export const toTextSegments = (text: string, values?: DescriptionValues) => {
  const segments: TextSegment[] = [];
  let end = 0;
  for (const match of text.matchAll(SHOWN_VALUE_PATTERN)) {
    const [whole, sign, variable, percent] = match;
    const value = formatValue(values?.[variable]);
    if (value === undefined) continue;
    segments.push({ text: text.slice(end, match.index) }, { text: `${sign}${value}${percent}`, variable });
    end = match.index + whole.length;
  }
  segments.push({ text: text.slice(end) });
  return segments.filter(({ text: part }) => part !== '');
};

export const interpolate = (text: string, values?: DescriptionValues) =>
  toTextSegments(text, values)
    .map(({ text: part }) => part)
    .join('');

export const formatPatchNoteMismatch = (patchNote: PatchNoteMismatch, gameValue: string) =>
  typeof patchNote === 'string' ? `Patch notes: ${patchNote}. Game files: ${gameValue}.` : patchNote.tooltip;

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

// Game stat labels can be long: give them a short tile name.
const GAME_STAT_TILE_LABELS: Record<string, string> = {
  'Health regeneration': 'Regen',
};

export const toGameStatTiles = (stats: LabeledValue[] = []) =>
  stats.map(({ label, value, unit = '', levels, patchNote }) => ({
    label: GAME_STAT_TILE_LABELS[label] ?? label,
    value: `${[value].flat().map(formatNumber).join('/')}${unit}`,
    levels:
      Array.isArray(value) && levels?.length === value.length
        ? value.map((levelValue, index) => ({ level: levels[index], value: `${formatNumber(levelValue)}${unit}` }))
        : undefined,
    patchNote,
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

const formatValue = (value?: DescriptionValues[string]) => {
  if (value === undefined || typeof value === 'string') return value;
  return Array.isArray(value) ? value.map(formatNumber).join('/') : formatNumber(value);
};

const toTierRank = ({ tier }: Entity) => Number(tier?.match(/\d+/)?.[0] ?? 1);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface LabeledValue {
  label: string;
  value: number | number[];
  unit?: string;
  levels?: number[];
  patchNote?: PatchNoteMismatch;
}

interface TextSegment {
  text: string;
  variable?: string;
}

interface Ordered {
  name: string;
  order?: number;
}

const toOrderRank = ({ order }: Ordered) => order ?? Number.MAX_SAFE_INTEGER;
