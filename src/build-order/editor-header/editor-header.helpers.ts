import { MAX_AUTHOR_LENGTH } from '../build-order.constants.ts';
import type { Build, BuildCatalog, HeroPoolEntry, Side } from '../build-order.types.ts';

// Setup hero pool; a hero already built at the Altar cannot be the setup hero too.
export const toHeroOptions = (pool: HeroPoolEntry[], catalog: BuildCatalog, build: Build) =>
  pool.map(({ heroId }) => ({
    value: heroId,
    label: catalog.get(heroId)?.displayName ?? heroId,
    isDisabled: build.queued.some(({ entityId }) => entityId === heroId),
  }));

export const toSideOptions = (sides: Side[], kind: Side['kind']) =>
  sides.filter((side) => side.kind === kind).map(({ id, name }) => ({ value: id, label: name }));

// Author field width in ch: the whole name or placeholder shows, one more ch for the caret, capped at the longest name.
export const toAuthorWidthCh = (author: string, placeholder: string) =>
  Math.min(Math.max(author.length, placeholder.length), MAX_AUTHOR_LENGTH) + 1;
