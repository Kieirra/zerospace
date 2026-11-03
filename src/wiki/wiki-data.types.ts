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
  minRange?: number;
  splashRadius?: number;
  // Percentage of the damage dealt to units in the splash radius.
  splashDamage?: number;
  // Field → value the patch notes announce where the game files differ ("splashDamage": "50%").
  patchNotes?: Record<string, string>;
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
  // 'heal' (bIsHeal or a heal execution): damage and dps are health restored per shot and per second. Absent = damage.
  kind?: 'damage' | 'heal';
  // Heal weapons: target types of CanAttack (only these) and CannotAttack (never these), last tag segment ("Biological").
  targets?: string[];
  excludedTargets?: string[];
}

// Healing outside weapons (HealUnits calls, healing effects applied by the entity or its abilities).
export interface Heal {
  name: string;
  amount?: number;
  perSecond?: number;
  interval?: number;
  radius?: number;
  duration?: number;
  targets?: string[];
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
  // With an array value: the effect level of each value (Infusion: 1st and 2nd infusion).
  levels?: number[];
}

export interface Ability {
  targets?: string[];
  excludedTargets?: string[];
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
  // Description variable → value the patch notes announce where the game files differ ("speed": "+150").
  patchNotes?: Record<string, string>;
}

// Entity created by a topbar, talent or ability; id is the wiki id when the entity has its own file.
export interface Summon {
  name: string;
  kind: 'unit' | 'building';
  id?: string;
  count?: number;
  duration?: number;
  hp?: number;
  combatStats?: Stat[];
  transport?: { capacity?: number; unitCapacity?: number; targets?: string[]; excludedTargets?: string[] };
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
  combatStats?: Stat[];
  transport?: { capacity?: number; unitCapacity?: number; targets?: string[]; excludedTargets?: string[] };
  shields?: number;
  armor?: number;
  armorRating?: number;
  armorType?: string;
  weapons?: Weapon[];
  abilities?: Ability[];
}

export interface LoadBonus {
  name: string;
  recipient: 'carrier' | 'passenger';
  units?: string[];
  description?: string;
  stats?: Stat[];
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
  // Rank in the game menu, smaller first.
  order?: number;
  cost?: Cost;
  count?: number;
  buildTime?: number;
  supply?: number;
  hp?: number;
  combatStats?: Stat[];
  transport?: { capacity?: number; unitCapacity?: number; targets?: string[]; excludedTargets?: string[] };
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
  loadBonuses?: LoadBonus[];
  weapons?: Weapon[];
  abilities?: Ability[];
  maxTurrets?: number;
  turrets?: Turret[];
  producedBy?: string[];
  requires?: string[];
  upgrades?: string[];
  mergedFrom?: MergeSource[];         // Xol: units merged to obtain this one
  mergesInto?: string[];              // Xol: units this one merges into
  mergeForms?: MergeForm[];           // forms taken by absorbing a unit (Anrubic)
  economy?: EconomyStat[];            // harvesters: flux gathering
  heals?: Heal[];
  topbarEnergyCosts?: Record<string, number>;
  portrait?: string;
  asset: string;
}

// Economy figure of a base or harvester, as a player reads it.
export interface EconomyStat {
  label: string;
  value: number | number[];
  unit?: '/min' | '/s' | 's' | '%' | 'x';
  levels?: number[];
}

// Form a unit takes by absorbing another (Anrubic): what absorbing that unit gives it.
export interface MergeForm {
  with: string;
  stats?: Stat[];
  abilities?: Ability[];
  weapons?: Weapon[];
}

// Effects and replacement weapons of an upgrade applied to an existing Xol unit.
export interface MoltenForm {
  asset: string;
  name: string;
  description?: string;
  stats?: Stat[];
  weapons?: Weapon[];
}

// One ingredient of a Xol merge: count units of this id.
export interface MergeSource {
  id: string;
  count: number;
}

export interface BuildingFile {
  loadBonuses?: LoadBonus[];
  id: string;
  kind: 'building';
  faction: string;
  name: string;
  description?: string;
  details?: string;
  values?: DescriptionValues;
  hotkey?: string;
  // Rank in the game menu, smaller first.
  order?: number;
  cost?: Cost;
  buildTime?: number;
  hp?: number;
  combatStats?: Stat[];
  transport?: { capacity?: number; unitCapacity?: number; targets?: string[]; excludedTargets?: string[] };
  shields?: number;
  armor?: number;
  armorRating?: number;
  armorDamageTaken?: number;
  energy?: number;
  vision?: number;
  weapons?: Weapon[];
  maxTurrets?: number;
  turrets?: Turret[];
  produces?: string[];
  requires?: string[];
  unlocks?: string[];
  topbarEnergyCosts?: Record<string, number>;
  economy?: EconomyStat[];            // main bases: hexite extraction
  heals?: Heal[];
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
  // Buildings needed to access the upgrade: its required buildings plus the building that researches it
  // (its RequiredProducerTags, or for a unit upgrade the RequiredProducerTags of its target units).
  requires?: string[];
  targets?: string[];
  excludedTargets?: string[];
  id: string;
  kind: 'upgrade' | 'talent' | 'topbar';
  weapons?: Weapon[];
  faction: string;
  name: string;
  description?: string;
  details?: string;
  values?: DescriptionValues;
  stats?: Stat[];
  hotkey?: string;
  // Rank in the game menu, smaller first.
  order?: number;
  cost?: Cost;
  energyCost?: number | TopbarEnergyCost;
  energyCostChanges?: Record<string, EnergyCostChange>;
  cooldown?: number;
  range?: number;
  charges?: number;
  abilities?: Ability[];
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

// Versus patch notes of a Steam announcement (data/patch-notes/<gid>.json), split by faction and subject.
export interface PatchNoteLine {
  // Raw line of the post, BBCode removed.
  text: string;
  lines?: PatchNoteLine[];
}

export interface PatchNoteEntry {
  // Name as written in the post ("Overclock"), null for lines without a subject.
  subject: string | null;
  // Entities the entry concerns, [] when unresolved.
  entityIds: string[];
  // Bug fix brought back by data/patch-notes-overrides.json.
  kind?: 'fix';
  lines: PatchNoteLine[];
  // Developer rationale, raw text, paragraphs separated by "\n\n".
  note?: string;
}

export interface PatchNoteSection {
  // Faction id ("grell"), null for All Factions, Heroes, General...
  faction: string | null;
  heading: string;
  entries: PatchNoteEntry[];
}

export interface PatchNote {
  // Steam gid.
  id: string;
  // "Update #18", or "Patch" when the title has no number.
  label: string;
  title: string;
  // "YYYY-MM-DD", UTC.
  date: string;
  url: string;
  sections: PatchNoteSection[];
}
