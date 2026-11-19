// A ```bo build order of a guide, reduced to entity ids: what the tool can turn into a Build.

export type BoAnchor =
  // `->`, a free text condition, or the first group (at = 0).
  | { kind: 'after-previous' }
  | { kind: 'entity'; entityId: string; event: 'starts' | 'done' }
  // `when 2:30:` = 150.
  | { kind: 'time'; seconds: number }
  // `when 400 hexite:`
  | { kind: 'resources'; hexite?: number; flux?: number };

export interface BoItem {
  entityId: string;
  // `2 Bestiary` = 2 steps at the same at.
  count: number;
  // Entity id of the unit of `(loop X)`.
  loop?: string;
  // `(-> A -> B)`, a chain of groups.
  trigger?: BoGroup[];
}

export interface BoGroup {
  anchor: BoAnchor;
  items: BoItem[];
}

export interface BoPlan {
  factionId: string;
  mercenaryId: string | null;
  // Setup hero of the guide header.
  heroId: string | null;
  title: string;
  author: string;
  phases: { number: number; groups: BoGroup[] }[];
}
