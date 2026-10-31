import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WIKI_IMAGES_PATH } from '../../shared/site.constants.ts';

export const IMAGE_SIZES = {
  thumb: 32,
  card: 40,
  logo: 48,
  header: 64,
  tile: 80,
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

// Images are generated separately and may be missing: the build only links files present in public/.
export const findImageUrl = (id: string) => {
  const url = `${WIKI_IMAGES_PATH}/${id}.webp`;
  return existsSync(join(process.cwd(), 'public', url)) ? url : undefined;
};
