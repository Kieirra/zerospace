import { createPortal } from 'react-dom';
import { KIND_COLORS } from '../../../build-order.constants.ts';
import type { TileDetails } from '../palette-tile.helpers.ts';

interface PaletteTileTooltipProps {
  name: string;
  details: TileDetails;
  // Viewport rectangle of the hovered tile.
  anchor: DOMRect;
}

const GAP_PX = 6;

// Fixed above the tile, in the page body: the bevelled tile and the scrolling palette would clip it. Not focusable,
// the tile's label says the same.
export const PaletteTileTooltip = ({ name, details, anchor }: PaletteTileTooltipProps) =>
  createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[60] max-w-60 -translate-x-1/2 -translate-y-full border border-[#3b3a44] bg-surface-raised/95 px-3 py-2 text-xs shadow-lg shadow-black/50"
      style={{ left: anchor.left + anchor.width / 2, top: anchor.top - GAP_PX }}
    >
      <p className="font-semibold text-text">{name}</p>
      {details.time && <p className="mt-0.5 tabular-nums text-muted">{details.time}</p>}
      {details.requires && (
        <p className="mt-0.5 leading-snug" style={{ color: KIND_COLORS.idle }}>
          {details.requires}
        </p>
      )}
    </div>,
    document.body,
  );
