import { MAX_STEPS } from '../link/link.constants.ts';

// 300 ms after the last change.
export const HASH_SYNC_DELAY_MS = 300;

// The site navigation stays at the top of the page (`h-12`): the editor header sticks under it.
export const SITE_NAV_HEIGHT_PX = 48;

// A build of MAX_STEPS steps takes no more: past it, the link would no longer load.
export const BUILD_FULL_TEXT = `Build is full: ${MAX_STEPS} steps at most.`;
