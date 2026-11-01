import type { CollectionEntry } from 'astro:content';

export type Faction = CollectionEntry<'factions'>['data'];
export type Entity = CollectionEntry<'entities'>['data'];
export type EntityKind = Entity['kind'];
export type Weapon = NonNullable<Entity['weapons']>[number];
export type DescriptionValues = NonNullable<Entity['values']>;

export type Turret = NonNullable<Entity['turrets']>[number];
export type GameStat = NonNullable<Entity['stats']>[number];
export type Summon = NonNullable<Entity['summons']>[number];

export interface StatTile {
  label: string;
  value: string | CostSegment[];
  batch?: { count: number; cost: CostSegment[] };
  isAccent?: boolean;
  levels?: { level: number; value: string }[];
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
