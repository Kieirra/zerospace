import type { CollectionEntry } from 'astro:content';
import type { PatchNoteMismatch } from './wiki-data.types.ts';

export type Faction = CollectionEntry<'factions'>['data'];
export type Entity = CollectionEntry<'entities'>['data'];
export type EntityKind = Entity['kind'];
export type Weapon = NonNullable<Entity['weapons']>[number];
export type DescriptionValues = NonNullable<Entity['values']>;

export type Turret = NonNullable<Entity['turrets']>[number];
export type GameStat = NonNullable<Entity['stats']>[number];
export type Summon = NonNullable<Entity['summons']>[number];
export type Heal = NonNullable<Entity['heals']>[number];

export interface StatTile {
  label: string;
  value: string | CostSegment[];
  batch?: { count: number; cost: CostSegment[] };
  isAccent?: boolean;
  isHeal?: boolean;
  levels?: { level: number; value: string }[];
  // Spans two tile columns on wide enough grids, for tiles with long values.
  span?: 2;
  // Value the patch notes announce where the game files differ.
  patchNote?: PatchNoteMismatch;
}

export interface CostSegment {
  amount: string;
  resource: keyof NonNullable<Entity['cost']>;
  suffix?: string;
}

export interface Tab {
  slug: string;
  kind: EntityKind;
  label: string;
}
