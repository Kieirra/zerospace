import { KIND_LABELS } from '../../wiki/wiki.constants.ts';
import { formatOptionalSeconds, formatUnitCost } from '../../wiki/wiki.helpers.ts';
import type { Entity } from '../../wiki/wiki.types.ts';

export const toPreviewId = (entityId: string) => `preview-${entityId.replaceAll('/', '-')}`;

export const toPreviewSummaryId = (entityId: string) => `${toPreviewId(entityId)}-summary`;

// Read by screen readers in place of the tiles: "Unit · 100 hexite · 30s".
export const formatPreviewSummary = (entity: Entity) => {
  const cost = formatUnitCost(entity)?.map(({ amount, resource }) => `${amount} ${resource}`) ?? [];
  return [KIND_LABELS[entity.kind], ...cost, formatOptionalSeconds(entity.buildTime)].filter(Boolean).join(' · ');
};

// Units and heroes are told apart by their stats, the other kinds by what they do.
export const hasPreviewDescription = (entity: Entity) => entity.kind !== 'unit' && entity.kind !== 'hero';
