import { PaletteTile } from '../palette-tile/palette-tile.tsx';
import type { BuildEntity } from '../../build-order.types.ts';
import type { PaletteTileData } from '../action-palette.helpers.ts';

interface PaletteGridProps {
  tiles: PaletteTileData[];
  onAdd: (entity: BuildEntity) => void;
}

// Four tiles a row (Kieirra 2026-11-19).
export const PaletteGrid = ({ tiles, onAdd }: PaletteGridProps) => (
  <div className="grid grid-cols-4 gap-1.5">
    {tiles.map((tile) => (
      <PaletteTile key={tile.entity.id} tile={tile} onAdd={onAdd} />
    ))}
  </div>
);
