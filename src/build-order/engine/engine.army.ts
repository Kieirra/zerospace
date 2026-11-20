import { LANE_ID_PREFIX } from './engine.constants.ts';
import { toSeconds } from './engine.economy.ts';
import { toLaneId } from './engine.state.ts';
import type { BuildEntity } from '../build-order.types.ts';
import type { ArmyUnit, OrderState, SimulationState } from './engine.internal.types.ts';
import type { OrderTiming } from './engine.types.ts';

// Army of the simulation (US-009): every unit made, never lost, by entity id, in the order they are ready, then lane
// order. A merge takes its inputs there, the oldest free ones first; a Replicate copy needs a free unit of its target.

// At the end of a unit order (a pack of `count` units), a merge or a copy (one unit).
export const addToArmy = (state: SimulationState, order: OrderState) => {
  const { entity, plan, occurrence, endTick = state.tick } = order;
  if (!isArmyCategory(entity)) return;
  const laneId = order.laneId ?? (order.producer ? toLaneId(order.producer) : '');
  const count = entity.category === 'unit' ? entity.count : 1;
  for (let index = 0; index < count; index += 1) {
    joinArmy(state, { entityId: entity.id, readyTick: endTick, laneId, stepUid: plan.uid, occurrence });
  }
};

// A unit joins once ready: after the units ready before it, and after those ready at the same tick on a higher lane.
export const joinArmy = (state: SimulationState, unit: ArmyUnit) => {
  const units = state.army.get(unit.entityId) ?? [];
  const rank = toLaneRank(state, unit.laneId);
  const index = units.findIndex(({ readyTick, laneId }) => readyTick > unit.readyTick || (readyTick === unit.readyTick && toLaneRank(state, laneId) > rank));
  units.splice(index === -1 ? units.length : index, 0, unit);
  state.army.set(unit.entityId, units);
  state.hasPendingChanged = true;
};

// The first `count` free units of the entity, the oldest first; fewer when there are not enough.
export const findFreeUnits = (state: SimulationState, entityId: string, count: number) =>
  (state.army.get(entityId) ?? []).filter(({ takenBy }) => takenBy === undefined).slice(0, count);

// A merge takes its inputs at its start, in recipe order.
export const takeUnits = (state: SimulationState, order: OrderState) => {
  const inputs = (order.entity.mergedFrom ?? []).flatMap(({ entityId, count }) => findFreeUnits(state, entityId, count));
  for (const unit of inputs) unit.takenBy = { stepUid: order.plan.uid, occurrence: order.occurrence };
  order.inputs = inputs;
  state.hasPendingChanged = true;
  return inputs;
};

// The free unit ready the latest: where a copy shows.
export const findLastFreeUnit = (state: SimulationState, entityId: string) =>
  (state.army.get(entityId) ?? []).findLast(({ takenBy }) => takenBy === undefined);

// Inputs still missing for the merge, in recipe order.
export const toMissingInputs = (state: SimulationState, entity: Pick<BuildEntity, 'mergedFrom'>) =>
  (entity.mergedFrom ?? []).flatMap(({ entityId, count }) => {
    const missing = count - findFreeUnits(state, entityId, count).length;
    return missing > 0 ? [{ entityId, count: missing }] : [];
  });

// A merge has all its inputs, a copy a free unit of its target; any other order needs no unit.
export const hasArmyInputs = (order: OrderState, state: SimulationState) => {
  if (order.entity.category === 'merge') return toMissingInputs(state, order.entity).length === 0;
  if (order.entity.category === 'replicate') return findLastFreeUnit(state, order.entity.id) !== undefined;
  return true;
};

// What the army tells of an order: the units a merge took, the merges that took its units, the state of the inputs of a
// merge that never starts, the energy of a copy.
export const toArmyTiming = (order: OrderState, state: SimulationState): Partial<OrderTiming> => {
  const { entity, plan, occurrence } = order;
  const units = [...state.army.values()].flat();
  const made = units.filter((unit) => unit.stepUid === plan.uid && unit.occurrence === occurrence);
  const takenBy = toTakers(made, state);
  return {
    ...(order.inputs && { inputs: toInputs(order.inputs) }),
    ...(takenBy.length > 0 && { takenBy }),
    ...(entity.category === 'merge' && order.startTick === undefined && { inputStatus: toInputStatus(entity, units, state) }),
    ...(entity.category === 'replicate' && { energy: entity.replicateEnergy }),
  };
};

const isArmyCategory = ({ category }: BuildEntity) => category === 'unit' || category === 'merge' || category === 'replicate';

// Lane order rank of a lane id; Infinity for the Misc lane.
export const toLaneRank = (state: SimulationState, laneId: string) =>
  laneId.startsWith(LANE_ID_PREFIX) ? (state.laneRank.get(laneId.slice(LANE_ID_PREFIX.length)) ?? Infinity) : Infinity;

const toInputs = (inputs: ArmyUnit[]): NonNullable<OrderTiming['inputs']> =>
  inputs.reduce<NonNullable<OrderTiming['inputs']>>((groups, { stepUid, occurrence, laneId, readyTick }) => {
    const group = groups.find((candidate) => candidate.stepUid === stepUid && candidate.occurrence === occurrence);
    if (group) group.count += 1;
    else groups.push({ stepUid, occurrence, laneId, readyAt: toSeconds(readyTick), count: 1 });
    return groups;
  }, []);

// The merges that took some of `units`, in the order they took them, with how many each.
const toTakers = (units: ArmyUnit[], state: SimulationState) =>
  units.reduce<{ stepUid: string; startAt: number; count: number }[]>((takers, { takenBy }) => {
    if (!takenBy) return takers;
    const taker = takers.find(({ stepUid }) => stepUid === takenBy.stepUid);
    if (taker) taker.count += 1;
    else takers.push({ stepUid: takenBy.stepUid, startAt: toTakerStart(state, takenBy), count: 1 });
    return takers;
  }, []);

const toTakerStart = (state: SimulationState, { stepUid, occurrence }: NonNullable<ArmyUnit['takenBy']>) => {
  const taker = state.orders.find(({ plan, occurrence: candidate }) => plan.uid === stepUid && candidate === occurrence);
  return toSeconds(taker?.startTick ?? 0);
};

const toInputStatus = (entity: BuildEntity, units: ArmyUnit[], state: SimulationState) =>
  (entity.mergedFrom ?? []).map(({ entityId, count }) => {
    const ofInput = units.filter((unit) => unit.entityId === entityId);
    return {
      entityId,
      count,
      free: ofInput.filter(({ takenBy }) => takenBy === undefined).length,
      takenBy: toTakers(ofInput, state),
    };
  });
