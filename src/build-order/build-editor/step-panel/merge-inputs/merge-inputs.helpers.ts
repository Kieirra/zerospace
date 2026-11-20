import { formatClock, joinNames } from '../../../build-order.helpers.ts';
import type { BuildCatalog, BuildEntity } from '../../../build-order.types.ts';
import type { OrderTiming, SimulationResult } from '../../../engine/engine.types.ts';

// A unit a started merge took: a click selects the step that made it.
export interface TakenInputRow {
  stepUid: string;
  entity?: BuildEntity;
  name: string;
  laneLabel: string;
  readyAt: string;
}

// Inputs of a started merge (US-009), one row per unit: 'Roller  Gyroforge  ready 1:05'.
export const toTakenInputRows = (order: OrderTiming, result: SimulationResult, catalog: BuildCatalog): TakenInputRow[] =>
  (order.inputs ?? []).flatMap(({ stepUid, occurrence, laneId, readyAt, count }) => {
    const entity = catalog.get(toOrderEntityId(result, stepUid, occurrence));
    const row = {
      stepUid,
      entity,
      name: entity?.name ?? '',
      laneLabel: result.lanes.find(({ id }) => id === laneId)?.label ?? '',
      readyAt: `ready ${formatClock(readyAt)}`,
    };
    return Array.from({ length: count }, () => row);
  });

// Inputs of a merge that never starts, one line per input type: '3 Roller · 1 free · 2 taken by Echo 1:40'.
export const toInputStatusLines = (order: OrderTiming, result: SimulationResult, catalog: BuildCatalog) =>
  (order.inputStatus ?? []).map(({ entityId, count, free, takenBy }) => {
    const taken = takenBy.reduce((total, taker) => total + taker.count, 0);
    const takers = takenBy.map(({ stepUid, startAt }) => toTakerText(result, catalog, stepUid, startAt));
    return [`${count} ${catalog.get(entityId)?.name ?? entityId}`, `${free} free`, ...(taken > 0 ? [`${taken} taken by ${joinNames(takers, 'and')}`] : [])].join(
      ' · ',
    );
  });

// 'Echo 1:40': the merge that took a unit and when.
export const toTakerText = (result: SimulationResult, catalog: BuildCatalog, stepUid: string, startAt: number) =>
  `${catalog.get(toOrderEntityId(result, stepUid, 0))?.name ?? ''} ${formatClock(startAt)}`;

const toOrderEntityId = (result: SimulationResult, stepUid: string, occurrence: number) =>
  result.orders.find((order) => order.stepUid === stepUid && order.occurrence === occurrence)?.entityId ?? '';
