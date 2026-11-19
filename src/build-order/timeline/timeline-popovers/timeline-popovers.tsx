import { EntityCard } from '../entity-card/entity-card.tsx';
import { EntityCostFacts } from '../entity-card/entity-cost-facts/entity-cost-facts.tsx';
import { toItemTimesLabel } from '../timeline.helpers.ts';
import type { BuildCatalog } from '../../build-order.types.ts';
import type { AnchoredItem } from '../hooks/use-item-popovers.ts';

interface TimelinePopoversProps {
  opened: AnchoredItem | null;
  catalog: BuildCatalog;
  onClose: () => void;
}

// Entity card of the opened mark; no tooltip on hover (Kieirra 2026-11-19).
export const TimelinePopovers = ({ opened, catalog, onClose }: TimelinePopoversProps) => {
  const openedEntity = opened ? catalog.get(opened.item.entityId) : undefined;
  if (!opened || !openedEntity) return null;
  return (
    <EntityCard
      entity={openedEntity}
      anchor={opened.anchor}
      facts={
        opened.item.shape === 'setup-hero' ? (
          <span className="text-muted">{toItemTimesLabel(opened.item)}</span>
        ) : (
          <EntityCostFacts entity={openedEntity} />
        )
      }
      onClose={onClose}
    />
  );
};
