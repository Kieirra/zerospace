import { formatClock } from '../../build-order.helpers.ts';
import type { BuildEntity } from '../../build-order.types.ts';
import type { PaletteTileData } from '../action-palette.helpers.ts';

// The tile shows the price and the supply (Mazar 2026-11-17); its time and what it needs come on hover or focus.
export interface TileDetails {
  time: string;
  // Why the tile is disabled ('Requires Barracks.'), else null.
  requires: string | null;
}

export const toTileDetails = ({ entity, disabledReason }: PaletteTileData) => ({
  time: toTimeText(entity),
  requires: disabledReason,
});

// 'Build time 0:35', 'Research time 1:20', 'Instant, spends a mercenary slot'.
const toTimeText = ({ kind, category, duration }: Pick<BuildEntity, 'kind' | 'category' | 'duration'>) => {
  if (category === 'mercenary-unit') return 'Instant, spends a mercenary slot';
  const label = kind === 'upgrade' ? 'Research time' : 'Build time';
  return `${label} ${duration === null ? 'unknown' : formatClock(duration)}`;
};
