import {
  MAX_FLUX_NODES,
  MERCENARY_INITIAL_STACKS,
  MERCENARY_MAX_STACKS,
  MERCENARY_STACK_RECHARGE_SECONDS,
  PASSIVE_FLUX_PER_MIN,
  PASSIVE_HEXITE_PER_MIN,
  RESEARCH_LOCATIONS,
  STARTING_FLUX,
  STARTING_HEXITE,
  STARTING_HEXITE_WORKERS,
  STARTING_SUPPLY,
  SUPPLY_CAP,
  SUPPLY_PROVIDED_OVERRIDES,
} from './game-data.constants.ts';
import type { GameValue } from './game-data.constants.ts';

export interface ResolvedValue<T> {
  value: T | null;
  isProvisional: boolean;
  label: string;
}

export interface ResolvedGameValues {
  startingHexite: ResolvedValue<number>;
  startingFlux: ResolvedValue<number>;
  startingHexiteWorkers: ResolvedValue<number | 'full'>;
  startingSupply: ResolvedValue<number>;
  supplyCap: ResolvedValue<number>;
  passiveHexitePerMin: ResolvedValue<number>;
  passiveFluxPerMin: ResolvedValue<number>;
  maxFluxNodes: ResolvedValue<number>;
  mercenaryMaxStacks: ResolvedValue<number>;
  mercenaryInitialStacks: ResolvedValue<number>;
  mercenaryStackRechargeSeconds: ResolvedValue<number>;
  supplyProvidedOverrides: Record<string, number>;
  researchLocations: Record<string, string>;
}

// sideId null: no side chosen (no mercenary), only the common value applies.
export const resolveGameValue = <T>(gameValue: GameValue<T>, sideId: string | null): ResolvedValue<T> => {
  const confirmed = (sideId === null ? undefined : gameValue.bySide?.[sideId]) ?? gameValue.value;
  return {
    value: confirmed ?? gameValue.fallback,
    isProvisional: confirmed === null || confirmed === undefined,
    label: gameValue.label,
  };
};

export const resolveGameValues = (factionId: string, mercenaryId: string | null): ResolvedGameValues => ({
  startingHexite: resolveGameValue(STARTING_HEXITE, factionId),
  startingFlux: resolveGameValue(STARTING_FLUX, factionId),
  startingHexiteWorkers: resolveGameValue(STARTING_HEXITE_WORKERS, factionId),
  startingSupply: resolveGameValue(STARTING_SUPPLY, factionId),
  supplyCap: resolveGameValue(SUPPLY_CAP, factionId),
  passiveHexitePerMin: resolveGameValue(PASSIVE_HEXITE_PER_MIN, factionId),
  passiveFluxPerMin: resolveGameValue(PASSIVE_FLUX_PER_MIN, factionId),
  maxFluxNodes: resolveGameValue(MAX_FLUX_NODES, factionId),
  mercenaryMaxStacks: resolveGameValue(MERCENARY_MAX_STACKS, mercenaryId),
  mercenaryInitialStacks: resolveGameValue(MERCENARY_INITIAL_STACKS, mercenaryId),
  mercenaryStackRechargeSeconds: resolveGameValue(MERCENARY_STACK_RECHARGE_SECONDS, mercenaryId),
  supplyProvidedOverrides: SUPPLY_PROVIDED_OVERRIDES,
  researchLocations: RESEARCH_LOCATIONS,
});
