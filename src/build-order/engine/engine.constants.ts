// Time step of the simulation: integer ticks of 0.1 s.
export const TICK_PER_SECOND = 10;
export const HORIZON_SECONDS = 1800;
// The timelines show at least one minute: a short or empty build still has its resource curves over it.
export const MIN_SAMPLED_SECONDS = 60;

export const SECONDS_PER_MINUTE = 60;
export const PERCENT = 100;

// Amounts are rounded to this precision after each operation to avoid float drift.
export const AMOUNT_PRECISION = 1_000_000;

export const RESOURCES = ['hexite', 'flux'] as const;

export const WAIT_REASONS = ['hexite', 'flux', 'supply', 'producer-busy', 'requirement', 'reserved', 'stack', 'units'] as const;

export const RESOURCE_NAMES = { hexite: 'Hexite', flux: 'Flux' } as const;

// Lane ids: 'lane:base' is the starting base, then 'lane:<uid>' per building step, stable across edits.
export const LANE_ID_PREFIX = 'lane:';

// Lane of the talents, events and free units of the build (US-008).
export const MISC_LANE_ID = `${LANE_ID_PREFIX}misc`;
