import { Fragment } from 'react';
import { PaletteTile } from '../palette-tile/palette-tile.tsx';
import type { BuildEntity } from '../../build-order.types.ts';
import type { PaletteTileData } from '../action-palette.helpers.ts';

interface PaletteGridProps {
  tiles: PaletteTileData[];
  onAdd: (entity: BuildEntity) => void;
}

// Four tiles a row (Kieirra 2026-11-19); a section title on its own row before the first tile of its section (US-009).
export const PaletteGrid = ({ tiles, onAdd }: PaletteGridProps) => (
  <div className="grid grid-cols-4 gap-1.5">
    {tiles.map((tile, index) => (
      <Fragment key={tile.entity.id}>
        {tile.section !== undefined && tile.section !== tiles[index - 1]?.section && (
          <h3 className="label-caps col-span-4 pt-1.5 text-[10px] text-muted">{tile.section}</h3>
        )}
        <PaletteTile tile={tile} onAdd={onAdd} />
      </Fragment>
    ))}
  </div>
);
