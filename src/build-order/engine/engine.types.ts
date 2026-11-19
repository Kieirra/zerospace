import type { BuildEntity } from '../build-order.types.ts';
import type { ResolvedGameValues } from '../game-data/game-data.helpers.ts';
import type { GameRules } from '../rules/rules.data.ts';

export interface SimulationContext {
  // Faction + chosen mercenary.
  catalog: Map<string, BuildEntity>;
  // Used for the supply check (supplyProvided === null).
  factionEntities: BuildEntity[];
  startingBuildingId?: string;
  rules: GameRules;
  values: ResolvedGameValues;
  // Setup hero pool of the faction and mercenary (`getHeroPool`).
  heroPoolIds: string[];
}

// requirement: a required building not finished yet; reserved: held behind an order that saves for its resources.
export type WaitReason = 'hexite' | 'flux' | 'supply' | 'producer-busy' | 'requirement' | 'reserved' | 'stack';

export type Resource = 'hexite' | 'flux';

export interface OrderTiming {
  stepUid: string;
  entityId: string;
  // Producing instance, or created instance for a building; null outside any queue.
  laneId: string | null;
  // Click time of a timed step, time it entered its building's queue for a unit; null: never.
  clickAt: number | null;
  startAt: number | null;
  endAt: number | null;
  // Seconds between click and start, by reason.
  waits: Partial<Record<WaitReason, number>>;
}

export interface StepTiming {
  stepUid: string;
  clickAt: number | null;
  startAt: number | null;
  endAt: number | null;
  laneId: string | null;
  diagnostics: Diagnostic[];
}

export type LaneGroup = 'building' | 'unit' | 'research' | 'mercenary' | 'hero';

export interface Lane {
  // 'lane:base' = starting base, else 'lane:<uid of the building step>'.
  id: string;
  // Current entity (after transformation).
  entityId: string;
  originalEntityId: string;
  // 'Barracks', 'Barracks #1' and 'Barracks #2' when there are several, by lane order.
  label: string;
  isStarting: boolean;
  // Start of construction (0 for the starting base).
  startAt: number;
  readyAt: number;
  idle: { from: number; to: number }[];
  // Mercenary building only.
  stacks?: StackGauge;
}

export interface StackGauge {
  max: number;
  // Initial stacks and recharge both known.
  isKnown: boolean;
  points: { t: number; count: number }[];
}

export interface SetupHero {
  entityId: string;
  at: number;
  supply: number;
}

export interface HeroSummary {
  setup: SetupHero | null;
}

export interface ResourceSample {
  t: number;
  hexite: number;
  flux: number;
  supplyUsed: number;
  supplyCap: number | null;
}

export type DiagnosticCode =
  | 'missing-requirement'
  | 'missing-producer'
  | 'duplicate-research'
  | 'duplicate-mercenary-building'
  | 'exclusive-research'
  | 'wrong-producer'
  | 'unknown-entity'
  | 'never-starts'
  | 'harvester-cap'
  | 'unknown-research-location'
  | 'unknown-duration'
  | 'unknown-producer'
  | 'supply-not-checked'
  | 'flux-nodes-unknown'
  | 'hero-not-in-pool'
  | 'hero-already-picked'
  | 'hero-duplicate'
  | 'hero-no-slot'
  | 'hero-not-buildable'
  | 'unknown-stack-rule'
  | 'mercenary-not-allowed';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  stepUid?: string;
}

export interface SimulationResult {
  steps: StepTiming[];
  orders: OrderTiming[];
  lanes: Lane[];
  // One per whole second from 0 to ceil(endTime).
  samples: ResourceSample[];
  endTime: number;
  supply: { used: number; cap: number | null; isChecked: boolean };
  // All of them, global ones included.
  diagnostics: Diagnostic[];
  heroes: HeroSummary;
}
