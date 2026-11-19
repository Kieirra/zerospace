import clsx from 'clsx';
import { useState } from 'react';
import { KIND_COLORS } from '../../build-order.constants.ts';
import { CostAmount } from '../../cost-amount/cost-amount.tsx';
import { EntityIcon } from '../../entity-icon/entity-icon.tsx';
import { SupplyAmount } from '../../supply-amount/supply-amount.tsx';
import { ENTITY_DRAG_TYPE, draggedEntity } from '../../timeline/timeline-editing.ts';
import { toTileLabel } from '../action-palette.helpers.ts';
import { PaletteTileTooltip } from './palette-tile-tooltip/palette-tile-tooltip.tsx';
import { toTileDetails } from './palette-tile.helpers.ts';
import type { BuildEntity } from '../../build-order.types.ts';
import type { PaletteTileData } from '../action-palette.helpers.ts';

interface PaletteTileProps {
  tile: PaletteTileData;
  onAdd: (entity: BuildEntity) => void;
}

// Disabled when it cannot be added now (Kieirra 2026-11-19): neither clickable nor draggable, its reason in the title.
// Click: added after the latest click, or to the queue; drag onto the timeline: added where dropped.
// The tile shows the price and the supply a unit takes (Mazar 2026-11-17); build time and what it needs come in a
// tooltip on hover or focus.
export const PaletteTile = ({ tile, onAdd }: PaletteTileProps) => {
  const { entity, disabledReason, status } = tile;
  const isGreyed = disabledReason !== null && status !== 'free-setup';
  const isDisabled = disabledReason !== null;
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const show = (element: HTMLElement) => setAnchor(element.getBoundingClientRect());
  const hide = () => setAnchor(null);
  return (
    <button
      type="button"
      aria-label={toTileLabel(tile)}
      title={disabledReason ?? undefined}
      disabled={isDisabled}
      onClick={() => onAdd(entity)}
      draggable={!isDisabled}
      onDragStart={(event) => {
        hide();
        draggedEntity.id = entity.id;
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData(ENTITY_DRAG_TYPE, entity.id);
      }}
      onDragEnd={() => {
        draggedEntity.id = null;
      }}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={hide}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={hide}
      className={clsx(
        'bevel-sm relative flex min-h-[96px] cursor-pointer flex-col gap-0.5 border px-1 pt-[42px] pb-1.5 text-left text-[11px]',
        'bg-surface enabled:hover:bg-surface-hover disabled:cursor-default',
        status === 'available' ? 'border-line' : 'border-[#ffd45c]/50',
        isGreyed && 'opacity-55',
      )}
    >
      <span className={clsx('absolute top-1 left-1 flex size-8 items-center justify-center', isGreyed && 'grayscale')}>
        {entity.imageUrl ? (
          <img src={entity.imageUrl} alt="" width={32} height={32} className="size-8 object-contain" />
        ) : (
          <EntityIcon entity={entity} />
        )}
      </span>
      <span className="leading-tight font-semibold hyphens-auto [overflow-wrap:break-word]">{entity.displayName}</span>
      {/* One resource a line, never cut (Kieirra 2026-11-19). */}
      <span className="flex flex-col">
        {entity.cost.hexite > 0 && <CostAmount resource="hexite" amount={entity.cost.hexite} />}
        {entity.cost.flux > 0 && <CostAmount resource="flux" amount={entity.cost.flux} />}
        {entity.supply > 0 && <SupplyAmount amount={entity.supply} />}
      </span>
      {status === 'in-build' && <span style={{ color: KIND_COLORS.hero }}>✔ In build</span>}
      {anchor && <PaletteTileTooltip name={entity.displayName} details={toTileDetails(tile)} anchor={anchor} />}
    </button>
  );
};
