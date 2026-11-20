import { byOrderThenName } from '../../../../wiki/wiki.helpers.ts';
import { MERGE_ORDER } from '../../../game-data/game-data.constants.ts';
import type { BuildCatalog, BuildEntity } from '../../../build-order.types.ts';

// Units a Replicate copy may target (US-009): those with an energy cost, in the order of the palette (the units, then
// the merges in the game menu order).
export const toReplicateTargetOptions = (catalog: BuildCatalog) =>
  [...catalog.values()].filter(({ replicateEnergy }) => replicateEnergy !== undefined).sort(byPaletteOrder);

const byPaletteOrder = (a: BuildEntity, b: BuildEntity) =>
  Number(a.category === 'merge') - Number(b.category === 'merge') ||
  MERGE_ORDER.indexOf(a.id) - MERGE_ORDER.indexOf(b.id) ||
  byOrderThenName(a, b);
