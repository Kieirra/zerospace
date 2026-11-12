import type { CollectionEntry } from 'astro:content';
import type { CostSegment, Entity, EntityKind, Faction } from '../wiki/wiki.types.ts';

export type ResolvableKind = Exclude<EntityKind, 'talent'>;
export type PatchStatus = 'current' | 'previous' | 'outdated';
export type GuideStyle = NonNullable<CollectionEntry<'guides'>['data']['style']>;
export type BuildOrderEvent = 'starts' | 'done';

// Build order block before name resolution.
export interface BuildOrderName {
  name: string;
  kind?: ResolvableKind;
}

export type BuildOrderTarget = BuildOrderName | { text: string };

export interface BuildOrderItem {
  count: number;
  target: BuildOrderTarget;
  note?: number;
  // Unit or hero produced in a loop by the item.
  loop?: BuildOrderName;
  // Groups started as soon as the item is started.
  trigger?: BuildOrderGroup[];
  // Source line, for the resolution errors.
  line: number;
}

// `when Kraegar starts:` before a group.
export interface BuildOrderEntityCondition extends BuildOrderName {
  type: 'entity';
  event: BuildOrderEvent;
  line: number;
}

// `when 150 hexite and 100 flux:`: resources in the bank.
export interface BuildOrderResourcesCondition {
  type: 'resources';
  resources: CostSegment[];
}

// `when 2:30:`
export interface BuildOrderTimerCondition {
  type: 'timer';
  time: string;
}

// `when they scout you:`
export interface BuildOrderTextCondition {
  type: 'text';
  text: string;
}

export type BuildOrderCondition =
  | BuildOrderEntityCondition
  | BuildOrderResourcesCondition
  | BuildOrderTimerCondition
  | BuildOrderTextCondition;

export type ResolvedBuildOrderCondition =
  | { type: 'entity'; entity: Entity; event: BuildOrderEvent }
  | BuildOrderResourcesCondition
  | BuildOrderTimerCondition
  | BuildOrderTextCondition;

// The resources or the timer, rendered as a chip read by its label: "When 150 hexite and 100 flux", "At 2:30".
export type BuildOrderChipWhen = (BuildOrderResourcesCondition | BuildOrderTimerCondition) & { label: string };

// "When Altar done", the chip of the resources or the timer, or the free text, rendered with their own style.
export type BuildOrderWhen = string | BuildOrderChipWhen | BuildOrderTextCondition;

export interface BuildOrderGroup {
  // Replaces the condition derived from the awaited group.
  condition?: BuildOrderCondition;
  items: BuildOrderItem[];
}

export interface BuildOrderStep {
  number: number;
  goal?: string;
  // Group n + 1 waits for group n to be done.
  groups: BuildOrderGroup[];
}

export interface BuildOrder {
  steps: BuildOrderStep[];
  notes: { mark: number; text: string }[];
}

// Raw text of the ```bo blocks of a guide.
export interface BuildOrderSources {
  // Absent when the body does not start with a block.
  main?: string;
  branches: string[];
}

export interface ResolvedBuildOrderItem {
  count: number;
  // Absent for free text.
  entity?: Entity;
  text?: string;
  // Expansion number (2, 3...) when the entity is a headquarters.
  base?: number;
  note?: number;
  loop?: Entity;
  trigger?: ResolvedBuildOrderGroup[];
}

export interface ResolvedBuildOrderGroup {
  condition?: ResolvedBuildOrderCondition;
  items: ResolvedBuildOrderItem[];
}

interface BuildOrderRowBase {
  number: number;
  // "When Bestiary starts", "When Citadel done"... empty when nothing to wait for.
  when?: BuildOrderWhen;
}

interface BuildOrderGroupRow extends BuildOrderRowBase {
  items: ResolvedBuildOrderItem[];
}

// Unit or hero produced in a loop once its producer is done.
interface BuildOrderLoopRow extends BuildOrderRowBase {
  loop: Entity;
}

export type BuildOrderRow = BuildOrderGroupRow | BuildOrderLoopRow;

export interface BuildOrderPhase {
  number: number;
  goal?: string;
  rows: BuildOrderRow[];
}

export interface ResolvedBuildOrder {
  steps: {
    number: number;
    goal?: string;
    groups: ResolvedBuildOrderGroup[];
  }[];
  notes: BuildOrder['notes'];
  // Raw text of the block, for Copy.
  source: string;
}

export interface Guide {
  slug: string;
  title: string;
  author: string;
  description: string;
  patch: number;
  // YYYY-MM-DD
  added: string;
  patchStatus: PatchStatus;
  entry: CollectionEntry<'guides'>;
  style?: GuideStyle;
  faction?: Faction;
  mercenary?: Faction;
  // Free starting hero.
  hero?: Entity;
  // One per level, in level order. Empty without talents.
  talents: Entity[];
  army: Entity[];
  // P, G, L, X order.
  vs: { faction: Faction; rating: number }[];
  matchupTags: string[];
  strengths: string[];
  weaknesses: string[];
  // Absent when the body does not start with a ```bo block: no build order panel.
  mainBuildOrder?: ResolvedBuildOrder;
  // Other ```bo blocks, rendered in the prose.
  branches: Omit<ResolvedBuildOrder, 'source'>[];
}
