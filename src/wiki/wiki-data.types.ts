export interface FactionFile {
  id: string;
  kind: 'faction' | 'mercenary';
  name: string;
  color?: string;
  heroes: string[];
  topbar: string[];
  talents: string[];
  passiveIncome?: { level: number; researchItem: string }[];
  asset: string;
}

export interface Cost {
  hexite?: number;
  flux?: number;
}

export interface Weapon {
  name?: string;
  damage?: number;
  cooldown?: number;
  burst?: number;
  burstCooldown?: number;
  range?: number;
  warmup?: number;
  projectileSpeed?: number;
  melee?: boolean;
  // ANovaWeaponBase::GetWeaponDPS at rest: damage x shots per cycle x fire slots of the carrier / cycle duration.
  dps?: number;
  bonuses?: DamageBonus[];
}

// Extra damage against targets of a type (weapon DamageAffinities): value 150 = +150 %.
export interface DamageBonus {
  vs: string;
  value: number;
  unit: '%';
}

// Values of the description and details variables, keyed by the game's Format argument name.
// An array holds one value per level (index = level) when the game reads it from a curve;
// a string is a text argument (entity or ability name) as the game displays it in English.
export type DescriptionValues = Record<string, number | number[] | string>;

// Number of an upgrade, talent, topbar or ability that its texts do not give, as a player reads it.
export interface Stat {
  label: string;
  value: number | number[];
  unit?: '%' | 's' | '/s' | 'x';
}

export interface Ability {
  name: string;
  description?: string;
  details?: string;
  values?: DescriptionValues;
  stats?: Stat[];
  hotkey?: string;
  cooldown?: number;
  energyCost?: number;
  range?: number;
  charges?: number;
  summons?: Summon[];
}

// Entity created by a topbar, talent or ability; id is the wiki id when the entity has its own file.
export interface Summon {
  name: string;
  kind: 'unit' | 'building';
  id?: string;
  count?: number;
  duration?: number;
  hp?: number;
  shields?: number;
  armor?: number;
  armorRating?: number;
  armorType?: string;
  speed?: number;
  vision?: number;
  weapons?: Weapon[];
  abilities?: Ability[];
}

// Zone damage the ability applies itself (directly or through the actor it spawns), when not already in values.
export interface Area {
  damage?: number;
  interval?: number;
  radius?: number;
  duration?: number;
  shots?: number;
}

// Turret installable on a carrier slot (research item GrantLocalUnitUpgrade): text from the research item,
// cost, build time, vitals, weapons and abilities from the turret it creates.
export interface Turret {
  name: string;
  description?: string;
  values?: DescriptionValues;
  cost?: Cost;
  buildTime?: number;
  hp?: number;
  shields?: number;
  armor?: number;
  armorRating?: number;
  armorType?: string;
  weapons?: Weapon[];
  abilities?: Ability[];
}

export interface UnitFile {
  id: string;
  kind: 'unit' | 'hero';
  faction: string;
  name: string;
  description?: string;
  details?: string;
  values?: DescriptionValues;
  hotkey?: string;
  cost?: Cost;
  count?: number;
  buildTime?: number;
  supply?: number;
  hp?: number;
  shields?: number;
  armor?: number;
  armorRating?: number;
  armorType?: string;
  armorDamageTaken?: number;
  energy?: number;
  speed?: number;
  vision?: number;
  size?: number;
  pushTier?: number;
  transportSlots?: number;
  weapons?: Weapon[];
  abilities?: Ability[];
  maxTurrets?: number;
  turrets?: Turret[];
  producedBy?: string[];
  requires?: string[];
  upgrades?: string[];
  mergedFrom?: MergeSource[];         // Xol: units merged to obtain this one
  mergesInto?: string[];              // Xol: units this one merges into
  topbarEnergyCosts?: Record<string, number>;
  portrait?: string;
  asset: string;
}

// One ingredient of a Xol merge: count units of this id.
export interface MergeSource {
  id: string;
  count: number;
}

export interface BuildingFile {
  id: string;
  kind: 'building';
  faction: string;
  name: string;
  description?: string;
  details?: string;
  values?: DescriptionValues;
  hotkey?: string;
  cost?: Cost;
  buildTime?: number;
  hp?: number;
  shields?: number;
  armor?: number;
  armorRating?: number;
  armorDamageTaken?: number;
  vision?: number;
  weapons?: Weapon[];
  maxTurrets?: number;
  turrets?: Turret[];
  produces?: string[];
  requires?: string[];
  unlocks?: string[];
  topbarEnergyCosts?: Record<string, number>;
  upgradedFrom?: string;
  upgradesTo?: BuildingUpgrade[];
  portrait?: string;
  asset: string;
}

// Building a building turns into: its file, the upgrade entity that does it, the upgrade's cost and duration
// (construction cost and time of the resulting building).
export interface BuildingUpgrade {
  id: string;
  upgrade?: string;
  cost?: Cost;
  researchTime?: number;
}

// Energy of a topbar whose cost depends on the target: (hexite + flux * fluxWeight) * unitCostMultiplier + base,
// on the target's unit cost (batch / count). hero, massive and targets are fixed costs read from the game's branches.
export interface TopbarEnergyCost {
  unitCostMultiplier?: number;
  structureCostMultiplier?: number;
  supplyCostMultiplier?: number;
  fluxWeight?: number;
  base?: number;
  hero?: number;
  massive?: number;
  targets?: Record<string, number>;
}

export interface EnergyCostChange {
  energyCost?: number;
  unitCostMultiplier?: number;
  structureCostMultiplier?: number;
  supplyCostMultiplier?: number;
  base?: number;
}

export interface UpgradeFile {
  id: string;
  kind: 'upgrade' | 'talent' | 'topbar';
  faction: string;
  name: string;
  description?: string;
  details?: string;
  values?: DescriptionValues;
  stats?: Stat[];
  hotkey?: string;
  cost?: Cost;
  energyCost?: number | TopbarEnergyCost;
  energyCostChanges?: Record<string, EnergyCostChange>;
  cooldown?: number;
  range?: number;
  charges?: number;
  summons?: Summon[];
  area?: Area;
  researchTime?: number;
  tier?: string;
  exclusiveGroup?: string;
  level?: number;
  position?: string;
  appliesTo?: string[];
  transformsInto?: string;
  portrait?: string;
  asset: string;
}

export type WikiEntity = FactionFile | UnitFile | BuildingFile | UpgradeFile;
