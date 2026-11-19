// Game values the wiki extraction does not give. value null = unknown; fallback = provisional value (null = not checked).
export interface GameValue<T> {
  label: string;
  value: T | null;
  bySide?: Partial<Record<string, T | null>>;
  fallback: T | null;
  owner: 'Kieirra' | 'Mazar';
}

export interface HeroOverride {
  displayName?: string;
  unitCount?: number;
}

// PO1: confirmed by Mazar 2026-11-11.
export const STARTING_HEXITE: GameValue<number> = { label: 'Starting Hexite', value: 150, fallback: 150, owner: 'Mazar' };

// PO1: confirmed by Mazar 2026-11-11.
export const STARTING_FLUX: GameValue<number> = { label: 'Starting Flux', value: 0, fallback: 0, owner: 'Mazar' };

// PO2: confirmed by Mazar 2026-11-11, 'full' = `Workers` of the base economy.
export const STARTING_HEXITE_WORKERS: GameValue<number | 'full'> = {
  label: 'Starting workers',
  value: 'full',
  fallback: 'full',
  owner: 'Mazar',
};

// PO3: confirmed by Mazar 2026-11-13: a match starts at 0 / 15 supply with only the main base, for every faction.
// A second main base adds nothing; only the supply buildings (Supply Platform and its equivalents) do.
export const STARTING_SUPPLY: GameValue<number> = { label: 'Starting supply', value: 15, fallback: 15, owner: 'Mazar' };

// PO4: confirmed by Mazar 2026-11-14: supply is capped at 200 for every faction. Raw value kept here until the data
// of Kieirra gives it; then read it from `data/wiki/` and drop this constant.
export const SUPPLY_CAP: GameValue<number> = { label: 'Supply cap', value: 200, fallback: 200, owner: 'Mazar' };

// PO6: out of scope (Mazar 2026-11-11), income tied to XP levels.
export const PASSIVE_HEXITE_PER_MIN: GameValue<number> = { label: 'Passive Hexite', value: 0, fallback: 0, owner: 'Mazar' };

// PO6: out of scope (Mazar 2026-11-11), income tied to XP levels.
export const PASSIVE_FLUX_PER_MIN: GameValue<number> = { label: 'Passive Flux', value: 0, fallback: 0, owner: 'Mazar' };

// Mercenary stacks: since Steam build 26626645 every mercenary building gives them in the data (`productionCharges`:
// 1 at completion, 4 max, +1 every 90 s). The three values below are only the fallback for a building without them.
// Confirmed 2026-11-06.
export const MERCENARY_MAX_STACKS: GameValue<number> = { label: 'Mercenary stacks', value: 4, fallback: 4, owner: 'Mazar' };

// PO7: fallback only, stacks when the mercenary building completes.
export const MERCENARY_INITIAL_STACKS: GameValue<number> = {
  label: 'Initial mercenary stacks',
  value: null,
  fallback: 4,
  owner: 'Kieirra',
};

// PO7: fallback only, recharge time of a stack.
export const MERCENARY_STACK_RECHARGE_SECONDS: GameValue<number> = {
  label: 'Mercenary stack recharge',
  value: null,
  fallback: null,
  owner: 'Kieirra',
};

// PO9: confirmed by Mazar 2026-11-11, max harvesters = nodes × `Harvesters per node`.
export const MAX_FLUX_NODES: GameValue<number> = { label: 'Flux nodes', value: 4, fallback: 4, owner: 'Mazar' };

// PO5: building id → supply provided, when the data does not give the amount. Empty since Steam build 26626645:
// `supplyProvided` is in the data for every supply building (Xol Power Core 8).
export const SUPPLY_PROVIDED_OVERRIDES: Record<string, number> = {};

// PO8: upgrade id → building id where it is researched, when the data cannot tell.
// Protectorate (Mazar 2026-11-12): research for Barracks units is done in the Research Lab, research for
// Assembly Plant, War Foundry and Skydock units in the Mechanical Research Lab. Only the upgrades that require both labs
// need an entry; the others already require a single lab.
export const RESEARCH_LOCATIONS: Record<string, string> = {
  'protectorate/upgrade/eagle-tactics': 'protectorate/building/research-lab',
  'protectorate/upgrade/overpressure-nozzle': 'protectorate/building/research-lab',
  'protectorate/upgrade/retribution-protocol': 'protectorate/building/research-lab',
};

// Dual heroes, confirmed by Mazar.
export const HERO_OVERRIDES: Record<string, HeroOverride> = {
  'the-legion/hero/kraegar': { displayName: "Kraegar + Krag'vorn" },
  'valkaru/hero/mondar-and-torq': { unitCount: 2 },
};
