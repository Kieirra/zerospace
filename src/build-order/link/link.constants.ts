const LINK_VERSION = '3';
// Every link code starts with it.
export const LINK_PREFIX = `${LINK_VERSION}.`;
// Total of `timed` and `queued`.
export const MAX_STEPS = 200;
export const HASH_KEY = 'b';

// Texts shown by the editor; {old}, {current} and {n} are filled by the link helpers.
export const LINK_TEXTS = {
  invalid: "This link can't be read. It may be cut off or from an older version.",
  dataChanged: 'Made with game data {old}. Timings recomputed with current data ({current}).',
  dropped: '{n} step(s) removed: no longer in the game data.',
  newBuild: 'Start a new build',
} as const;
