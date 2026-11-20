import { AMOUNT_PRECISION, PERCENT, SECONDS_PER_MINUTE, TICK_PER_SECOND } from './engine.constants.ts';
import type { BuildEntity, HexiteBaseEconomy } from '../build-order.types.ts';
import type { ResolvedGameValues } from '../game-data/game-data.helpers.ts';
import type { HexiteMine, InstanceState, SimulationState } from './engine.internal.types.ts';
import type { SimulationContext } from './engine.types.ts';

export const toTicks = (seconds: number) => Math.round(seconds * TICK_PER_SECOND);

export const toSeconds = (ticks: number) => ticks / TICK_PER_SECOND;

export const roundAmount = (value: number) => Math.round(value * AMOUNT_PRECISION) / AMOUNT_PRECISION;

// Amount per tick of a rate given per minute.
export const perTick = (perMinute: number) => perMinute / SECONDS_PER_MINUTE / TICK_PER_SECOND;

// A new base gets its first worker one spawn time after it is ready. A rich spot mines at the rich rate from a rich
// pit: only the starting base, for every faction (Mazar 2026-11-17).
export const createHexiteMine = (economy: HexiteBaseEconomy, readyTick: number, workers = 0, isRich = false): HexiteMine => {
  const mined = isRich && economy.rich ? { ...economy, ...economy.rich } : economy;
  return {
    economy: mined,
    workers: Math.min(workers, economy.workers),
    nextWorkerTick: readyTick + toTicks(economy.workerSpawnSeconds),
    pitRemaining: mined.pitHexite,
  };
};

export const getStartingWorkers = (economy: HexiteBaseEconomy, values: ResolvedGameValues) => {
  const workers = values.startingHexiteWorkers.value;
  return workers === 'full' || workers === null ? economy.workers : workers;
};

// Hexite mined during [tick, tick + 1): due workers spawn first; once the pit is empty, a share of the rate remains.
export const mineHexite = (mine: HexiteMine, tick: number) => {
  spawnWorkers(mine, tick);
  const rate = perTick(mine.workers * mine.economy.hexitePerWorkerPerMin);
  if (mine.pitRemaining <= 0) return roundAmount((rate * mine.economy.depletedRatePercent) / PERCENT);
  const mined = Math.min(rate, mine.pitRemaining);
  mine.pitRemaining = roundAmount(mine.pitRemaining - mined);
  return roundAmount(mined);
};

export const getFluxPerTick = (harvesters: BuildEntity[]) =>
  harvesters.reduce(
    (total, harvester) =>
      total + (harvester.economy?.kind === 'flux-harvester' ? perTick(harvester.economy.fluxPerMin) : 0),
    0,
  );

// Flux income of the harvesters, raised by the Flux income talents applied so far (Lore of Flux): the only Flux formula.
export const getFluxIncomePerTick = (state: Pick<SimulationState, 'harvesters' | 'modifiers'>) =>
  getFluxPerTick(state.harvesters) * (1 + state.modifiers.fluxIncomePercent / PERCENT);

export const collectIncome = (state: SimulationState, context: SimulationContext) => {
  const hexite = state.instances.reduce(
    (total, { mine, readyTick }) => total + (mine && readyTick <= state.tick ? mineHexite(mine, state.tick) : 0),
    0,
  );
  const { passiveHexitePerMin, passiveFluxPerMin } = context.values;
  state.bank.hexite = roundAmount(state.bank.hexite + hexite + perTick(passiveHexitePerMin.value ?? 0));
  state.bank.flux = roundAmount(
    state.bank.flux + getFluxIncomePerTick(state) + perTick(passiveFluxPerMin.value ?? 0),
  );
};

// Checked only when the starting supply and the supply of every building of the faction are known.
export const isSupplyChecked = (values: ResolvedGameValues, factionEntities: BuildEntity[]) =>
  values.startingSupply.value !== null && factionEntities.every((entity) => entity.supplyProvided !== null);

// The starting base supply is the starting supply itself.
export const getSupplyCap = (instances: InstanceState[], context: SimulationContext) => {
  const startingSupply = context.values.startingSupply.value;
  if (startingSupply === null || !isSupplyChecked(context.values, context.factionEntities)) return null;
  const provided = instances
    .filter((instance) => instance.isComplete && !instance.isStarting)
    .reduce((total, instance) => total + (context.catalog.get(instance.originalEntityId)?.supplyProvided ?? 0), 0);
  return Math.min(context.values.supplyCap.value ?? Infinity, startingSupply + provided);
};

// 0 for a harvester without Flux economy: a number of the game is never guessed.
export const toHarvestersPerNode = ({ economy }: BuildEntity) => (economy?.kind === 'flux-harvester' ? economy.harvestersPerNode : 0);

// undefined: no known limit (unknown Flux nodes or harvester without economy).
export const getMaxHarvesters = (harvester: BuildEntity, values: ResolvedGameValues) => {
  const nodes = values.maxFluxNodes.value;
  if (nodes === null || harvester.economy?.kind !== 'flux-harvester') return undefined;
  return { max: nodes * harvester.economy.harvestersPerNode, nodes, perNode: harvester.economy.harvestersPerNode };
};

const spawnWorkers = (mine: HexiteMine, tick: number) => {
  const spawnTicks = toTicks(mine.economy.workerSpawnSeconds);
  while (mine.workers < mine.economy.workers && mine.nextWorkerTick <= tick) {
    mine.workers += 1;
    mine.nextWorkerTick += spawnTicks;
  }
};
