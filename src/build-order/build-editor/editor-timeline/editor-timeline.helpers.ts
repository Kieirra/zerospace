import type { SimulationResult } from '../../engine/engine.types.ts';

// Errors of no step (Kieirra 2026-11-19), shown above the timeline: a step's own errors are on its chip.
export const toGlobalErrorTexts = ({ diagnostics }: Pick<SimulationResult, 'diagnostics'>) => [
  ...new Set(diagnostics.filter(({ severity, stepUid }) => severity === 'error' && stepUid === undefined).map(({ message }) => message)),
];
