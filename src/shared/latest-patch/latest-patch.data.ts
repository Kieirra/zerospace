import { getPatchNotes } from '../../wiki/wiki.data.ts';
import type { GameVersion } from '../../wiki/wiki-seo.helpers.ts';
import { STEAM_BUILD_ID } from '../site.constants.ts';
import { findLatestPatch } from './latest-patch.helpers.ts';

export const getLatestPatch = async () => findLatestPatch(await getPatchNotes());

export const getGameVersion = async (): Promise<GameVersion> => ({
  build: STEAM_BUILD_ID,
  label: (await getLatestPatch()).label,
});
