import { REPLICATE_UID } from '../build-order.types.ts';
import type { BuildEntity, QueuedStep, TimedStep } from '../build-order.types.ts';
import type { ResolvedGameValues } from '../game-data/game-data.helpers.ts';
import type { OrderState } from './engine.internal.types.ts';
import type { SimulationContext } from './engine.types.ts';

// Replicate (US-009): one step is one copy of one Xol unit. The copy costs top bar energy only (not checked), takes the
// supply of one unit, is stunned 16 s, then joins the army as a unit of its target.

// The order of a copy: the target's id (the army counts it as one of them), no resource, no producer, no requirement.
export const toReplicateEntity = (unit: BuildEntity, values: ResolvedGameValues): BuildEntity => ({
  ...unit,
  category: 'replicate',
  cost: { hexite: 0, flux: 0 },
  count: 1,
  supply: unit.supply / unit.count,
  duration: values.replicateStunSeconds.value,
  producedBy: [],
  requires: [],
});

export const isReplicateStep = (step: Pick<TimedStep | QueuedStep, 'producerUid'>) => step.producerUid === REPLICATE_UID;

// The entity a step plays: its catalog entity, or the copy of it for a Replicate step; undefined when unknown or not
// replicable.
export const toStepEntity = (step: TimedStep | QueuedStep, context: SimulationContext) => {
  const entity = context.catalog.get(step.entityId);
  if (!entity || !isReplicateStep(step)) return entity;
  return entity.replicateEnergy === undefined ? undefined : toReplicateEntity(entity, context.values);
};

// Energy of the copies started: the tool shows it, never checks it against a reserve it does not know.
export const toEnergySpent = (orders: OrderState[]) =>
  orders.reduce(
    (total, { entity, startTick }) => (entity.category === 'replicate' && startTick !== undefined ? total + (entity.replicateEnergy ?? 0) : total),
    0,
  );
