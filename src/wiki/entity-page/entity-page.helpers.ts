import type { Entity } from '../wiki.types.ts';

const INFO_FIELDS = [
  'producedBy',
  'produces',
  'requires',
  'unlocks',
  'upgradedFrom',
  'transformsInto',
  'mergedFrom',
  'mergesInto',
  'topbarEnergyCosts',
  'level',
  'position',
  'tier',
  'exclusiveGroup',
  'appliesTo',
  'energyCostChanges',
] as const;

export const hasInfoColumn = (entity: Entity) =>
  typeof entity.energyCost === 'object' || INFO_FIELDS.some((field) => isFilled(entity[field]));

const isFilled = (value: unknown) =>
  value !== undefined && (typeof value !== 'object' || value === null || Object.keys(value).length > 0);
