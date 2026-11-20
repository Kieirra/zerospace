import type { SimulationResult } from '../../engine/engine.types.ts';

// Errors and infos of no step (Kieirra 2026-11-19), shown above the timeline: a step's own errors are on its chip. An
// info tells what the tool does not check (the top bar energy of Replicate, US-009).
export const toGlobalErrorTexts = ({ diagnostics }: Pick<SimulationResult, 'diagnostics'>) => [
  ...new Set(diagnostics.filter(({ severity, stepUid }) => severity !== 'warning' && stepUid === undefined).map(({ message }) => message)),
];
