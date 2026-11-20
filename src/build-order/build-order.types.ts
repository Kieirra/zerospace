import type { ProductionCharges } from '../wiki/wiki-data.types.ts';

// ---- Catalog

export type SideKind = 'faction' | 'mercenary';

export type EntityCategory =
  | 'building'
  | 'transformation'
  | 'harvester'
  | 'unit'
  | 'research'
  | 'mercenary-building'
  | 'mercenary-unit'
  | 'hero'
  | 'talent'
  | 'event';

export interface Side {
  id: string;
  kind: SideKind;
  name: string;
  accent: string;
  imageUrl?: string;
  heroIds: string[];
  // Heroes whose slug is shared by several factions (Marv, Mera).
  commonHeroIds: string[];
}

export interface HexiteBaseEconomy {
  kind: 'hexite-base';
  workers: number;
  hexitePerWorkerPerMin: number;
  workerSpawnSeconds: number;
  pitHexite: number;
  depletedRatePercent: number;
  // Rich Hexite spot (`(rich)` stats of the data): undefined when the data has none.
  rich?: RichHexite;
}

interface RichHexite {
  hexitePerWorkerPerMin: number;
  pitHexite: number;
}

export interface FluxHarvesterEconomy {
  kind: 'flux-harvester';
  fluxPerMin: number;
  harvestersPerNode: number;
}

export interface BuildEntity {
  id: string;
  sideId: string;
  kind: 'building' | 'unit' | 'hero' | 'upgrade' | 'talent' | 'event';
  category: EntityCategory;
  name: string;
  // "Kraegar + Krag'vorn" for dual heroes, otherwise name.
  displayName: string;
  hotkey?: string;
  imageUrl?: string;
  order?: number;
  // Cost of one production: a pack of `count` units.
  cost: { hexite: number; flux: number };
  count: number;
  // Supply of one production: data supply per unit × pack count (× unit count for a dual hero).
  supply: number;
  // buildTime ?? researchTime; null = unknown. 0 for a mercenary recruit (instant, spends a stack).
  duration: number | null;
  producedBy: string[];
  requires: string[];
  appliesTo: string[];
  transformsInto?: string;
  exclusiveGroup?: string;
  // Building obtained by transforming another one (`upgradedFrom`).
  isVariant: boolean;
  // undefined = provides none; null = provides some, amount unknown.
  supplyProvided?: number | null;
  economy?: HexiteBaseEconomy | FluxHarvesterEconomy;
  // Mercenary building: stacks at completion, max and recharge seconds. undefined = not in the data.
  productionCharges?: ProductionCharges;
  // Talent: level of the talent tree; undefined otherwise.
  level?: number;
  // Misc steps only: card lines, already interpolated ('+2 Harvesters').
  effectLines?: string[];
  // Misc steps only: numbers resolved from the wiki values or game-data.misc.ts.
  effects?: MiscEffect[];
  // Event only: supply of the units it makes at once, from the wiki supply per unit. A Reinforcements waits until all
  // of it fits in the free supply.
  groupSupply?: number;
}

export interface EffectTarget {
  categories?: EntityCategory[];
  entityIds?: string[];
}

// A cost or duration multiplier and the orders it changes.
export interface TargetMultiplier {
  target: EffectTarget;
  multiplier: number;
}

export type MiscEffect =
  | { kind: 'flux-income'; percent: number }
  | ({ kind: 'cost' } & TargetMultiplier)
  | ({ kind: 'duration' } & TargetMultiplier)
  | { kind: 'grant'; hexite: number; flux: number }
  // Harvesters per node of the faction harvester (Lore of Flux fills one Flux node).
  | { kind: 'spawn-harvesters' }
  // Free units at the effect tick; waitsForSupply: the whole group waits for free supply (Reinforcements).
  | { kind: 'spawn-units'; entityId: string; count: number; waitsForSupply: boolean }
  // One free unit each time an order of `trigger` finishes after the effect tick.
  | { kind: 'spawn-on-finish'; entityId: string; trigger: SpawnTrigger }
  | { kind: 'building-copies'; entityId: string; copies: number };

// faction-unit: a 'unit' order finished on an instance of a faction building (Unending Army, Kieirra 2026-11-20).
// recruit-at: a 'mercenary-unit' order finished on an instance of `producerId` (Hounds of War).
export type SpawnTrigger = { kind: 'faction-unit' } | { kind: 'recruit-at'; producerId: string };

export interface SideCatalog {
  side: Side;
  entities: BuildEntity[];
  // Wiki kinds by name key (`toNameKinds`): what a guide build order can cite.
  nameKinds: Record<string, string[]>;
}

export type BuildCatalog = Map<string, BuildEntity>;

type HeroOrigin = 'faction' | 'common' | 'mercenary';

export interface HeroPoolEntry {
  heroId: string;
  origin: HeroOrigin;
}

// ---- Build

// Lane id of the starting building in `producerUid` (Kieirra 2026-11-19).
export const BASE_UID = 'base';

// Building, mercenary building, research, transformation: placed at a click time.
export interface TimedStep {
  uid: string;
  entityId: string;
  // Click time, whole seconds, 0..HORIZON_SECONDS.
  at: number;
  // Transformation only: uid of the building TimedStep or BASE_UID; absent = Auto.
  producerUid?: string;
}

// Unit, harvester, Altar hero, mercenary recruit: made as soon as possible by a building.
export interface QueuedStep {
  uid: string;
  entityId: string;
  // Uid of the building TimedStep or BASE_UID; absent = Auto.
  producerUid?: string;
  // Not released before, whole seconds; absent = as soon as possible (Kieirra 2026-11-19).
  at?: number;
  // Unit made again on its building until the end of the last step outside the loops (D6).
  repeat?: true;
}

export interface Build {
  version: 3;
  // Steam build id when the build was created.
  dataVersion: string;
  factionId: string;
  mercenaryId: string | null;
  // Setup hero (free at 0:15).
  heroId: string | null;
  title: string;
  author: string;
  // Kept sorted by (at, uid number) by the reducer.
  timed: TimedStep[];
  // Order = production order.
  queued: QueuedStep[];
}

// ---- Link v3 (raw refs, resolved against the catalogs later)

// producerIndex: position in the encoded `timed`, -1 = base, null = Auto.
export interface BuildLinkTimed {
  ref: string;
  at: number;
  producerIndex: number | null;
}

export interface BuildLinkQueued {
  ref: string;
  producerIndex: number | null;
  at: number | null;
  repeat?: true;
}

export interface BuildLink {
  dataVersion: string;
  factionId: string;
  mercenaryId: string | null;
  heroRef: string | null;
  title: string;
  author: string;
  timed: BuildLinkTimed[];
  queued: BuildLinkQueued[];
}

export type DecodeResult = { status: 'invalid' } | { status: 'ok'; link: BuildLink };

export interface ResolvedBuild {
  build: Build;
  isDataVersionChanged: boolean;
  linkDataVersion: string;
}

export interface KnownSides {
  factionIds: string[];
  mercenaryIds: string[];
}

export type CatalogsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; faction: SideCatalog; mercenary: SideCatalog | null };
