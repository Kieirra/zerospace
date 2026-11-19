import { MAX_STEPS } from '../link/link.constants.ts';

// Kieirra 2026-11-19: most reliable faction for the timeline. An address without build opens an empty one of it.
export const DEFAULT_FACTION_ID = 'the-legion';

// 300 ms after the last change.
export const HASH_SYNC_DELAY_MS = 300;

// A build of MAX_STEPS steps takes no more: past it, the link would no longer load.
export const BUILD_FULL_TEXT = `Build is full: ${MAX_STEPS} steps at most.`;
