const LINK_VERSION = '3';
// Every link code starts with it.
export const LINK_PREFIX = `${LINK_VERSION}.`;
// Total of `timed` and `queued`.
export const MAX_STEPS = 200;
export const HASH_KEY = 'b';
// producerIndex of the starting base and of a Replicate copy (US-009).
export const BASE_INDEX = -1;
export const REPLICATE_INDEX = -2;

// Texts shown by the editor; {old} and {current} are filled by the link helpers.
export const LINK_TEXTS = {
  invalid: "This link can't be read. It may be cut off or from an older version.",
  dataChanged: 'Made with game data {old}. Timings recomputed with current data ({current}).',
  newBuild: 'Start a new build',
} as const;
