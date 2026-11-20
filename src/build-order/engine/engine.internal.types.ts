import type { BuildEntity, HexiteBaseEconomy, SpawnTrigger, TargetMultiplier } from '../build-order.types.ts';
import type { StepKind } from '../build-order.helpers.ts';
import type { StartRank } from '../rules/rules.data.ts';
import type { Diagnostic, Resource, SetupHero, WaitReason } from './engine.types.ts';

// Internal state: times in ticks.

// Production: units, harvesters, Altar heroes, recruits. Research: researches and transformations. One order at a
// time on each, both at once on the same building (Kieirra 2026-11-19).
export type Thread = 'production' | 'research';

export interface PlannedStep {
  // Position in the plans: the timed steps, then the queued ones.
  index: number;
  uid: string;
  kind: StepKind;
  entity?: BuildEntity;
  isIgnored: boolean;
  // Timed step: click tick. Queued step: not released before this tick.
  atTick?: number;
  // Lane the step is pinned on (BASE_UID or a building uid); undefined = Auto.
  producerUid?: string;
  // Unit made again on its building until every step outside the loops is done (D6).
  repeat: boolean;
  rank: StartRank;
  // Index in `timed` or in `queued`: breaks the ties of the start priority.
  tie: number;
  // Requirements kept for the start: the ones absent from the build are dropped.
  requires: string[];
  // Ids an instance must have to take the order; empty = outside any thread (shown on the base lane).
  producerIds: string[];
  thread?: Thread;
  createsInstance: boolean;
  // Talent or event (US-008): applied by the effect schedule at its time, never an order.
  isEffect: boolean;
  // Hero built twice: uid of the first one, whose start the message gives.
  firstUid?: string;
  diagnostics: Diagnostic[];
}

export interface HexiteMine {
  economy: HexiteBaseEconomy;
  workers: number;
  nextWorkerTick: number;
  pitRemaining: number;
}

export interface InstanceState {
  // BASE_UID or the uid of the building step.
  uid: string;
  originalEntityId: string;
  entityId: string;
  // Its own id and the ids of its completed transformations.
  ids: Set<string>;
  isStarting: boolean;
  startTick: number;
  readyTick: number;
  isComplete: boolean;
  productionOrder: OrderState | null;
  researchOrder: OrderState | null;
  hasTransformation: boolean;
  mine?: HexiteMine;
  stacks?: StackState;
}

export interface StackState {
  count: number;
  max: number;
  // null: unknown recharge, a recruit beyond the stacks does not wait.
  rechargeTicks: number | null;
  nextTick?: number;
  isKnown: boolean;
  points: { tick: number; count: number }[];
}

export interface HeroSlots {
  setup: SetupHero | null;
  maxSlots: number;
}

export interface OrderState {
  plan: PlannedStep;
  entity: BuildEntity;
  // 0 for the step itself, then 1, 2… for the copies of its loop.
  occurrence: number;
  clickTick?: number;
  startTick?: number;
  endTick?: number;
  isDone: boolean;
  // Queued orders: released into a production thread.
  isReleased: boolean;
  producer?: InstanceState;
  created?: InstanceState;
  // Ticks between click and start, by reason.
  waits: Partial<Record<WaitReason, number>>;
  lastWait?: WaitReason;
  // Recruit launched without a stack left (unknown recharge).
  isBeyondStacks?: boolean;
  // Why it waits, given by the last full start pass.
  waitReason?: WaitReason;
  // Tick since which it waits for `lastWait`: those ticks are not in `waits` yet.
  waitSince?: number;
}

// A talent or an event of the build (US-008), applied once at `atTick` or later.
export interface ScheduledEffect {
  plan: PlannedStep;
  entity: BuildEntity;
  atTick: number;
  appliedTick?: number;
  // Reinforcements held by the supply: ticks waited.
  supplyWaitTicks: number;
  // Free units created by this step: tick and entity, for the results.
  spawns: { tick: number; entityId: string }[];
}

// What the applied effects change for the orders that start from then on.
export interface Modifiers {
  fluxIncomePercent: number;
  costs: TargetMultiplier[];
  durations: TargetMultiplier[];
  spawnOnFinish: { source: ScheduledEffect; entity: BuildEntity; trigger: SpawnTrigger }[];
}

// Start check of an order; `reason` undefined: the order can start.
export interface StartCheck {
  reason?: 'requirement' | 'producer-busy' | 'supply' | 'stack' | Resource;
  // Research or transformation: the instance whose research thread takes it.
  instance?: InstanceState;
}

export interface SimulationState {
  tick: number;
  bank: Record<Resource, number>;
  supplyUsed: number;
  instances: InstanceState[];
  instanceByUid: Map<string, InstanceState>;
  // Lane order of the building uids: the base first, then (at, index in timed).
  laneRank: Map<string, number>;
  harvesters: BuildEntity[];
  orders: OrderState[];
  ordersByUid: Map<string, OrderState>;
  // Timed orders sorted by (atTick, tie), released from `timedCursor` on.
  timedOrders: OrderState[];
  timedCursor: number;
  // Queued orders not released yet, in production order.
  queuedOrders: OrderState[];
  // Released orders not started, in start priority order.
  pending: OrderState[];
  // An order released, started or ended since the last full start pass.
  hasPendingChanged: boolean;
  // Checks before the last full start pass, and its tick.
  lastChecks: (StartCheck | undefined)[];
  lastFullPassTick: number;
  // No start check before this tick unless an order is released, started or ended.
  nextCheckTick: number;
  // Started orders not done, in plan order.
  running: OrderState[];
  // Orders outside the loops not done yet: the loops go on while there is one.
  openCount: number;
  setupHero: SetupHero | null;
  // Effects sorted by (atTick, tie); every one before `effectCursor` is applied.
  effects: ScheduledEffect[];
  effectCursor: number;
  modifiers: Modifiers;
}
