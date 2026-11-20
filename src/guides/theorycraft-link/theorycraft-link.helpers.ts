import { isBuildableEntity } from '../../build-order/catalog/catalog.helpers.ts';
import { SECONDS_PER_MINUTE } from '../../build-order/engine/engine.constants.ts';
import { REPLICATE_TOPBAR_ID } from '../../build-order/game-data/game-data.constants.ts';
import type { BoAnchor, BoGroup, BoItem, BoPlan } from '../../build-order/bo-plan/bo-plan.types.ts';
import type { CostSegment } from '../../wiki/wiki.types.ts';
import type {
  ResolvedBuildOrder,
  ResolvedBuildOrderCondition,
  ResolvedBuildOrderGroup,
  ResolvedBuildOrderItem,
} from '../guides.types.ts';

export type BoPlanHeader = Omit<BoPlan, 'phases'>;

// Lost on the way: free text, notes, goals, and the entities the tool cannot build (topbar), Replicate aside when it names
// its target (`Replicate (on Synapse)`, US-009). A free text condition is `->`.
export const toBoPlan = ({ steps }: Pick<ResolvedBuildOrder, 'steps'>, header: BoPlanHeader): BoPlan => ({
  ...header,
  phases: steps.map(({ number, groups }) => ({ number, groups: groups.map(toBoGroup) })),
});

const toBoGroup = ({ condition, items }: ResolvedBuildOrderGroup): BoGroup => ({
  anchor: toBoAnchor(condition),
  items: items.flatMap(toBoItems),
});

const toBoItems = ({ entity, count, on, loop, trigger }: ResolvedBuildOrderItem): BoItem[] =>
  entity && (isBuildableEntity(entity) || (entity.id === REPLICATE_TOPBAR_ID && on))
    ? [
        {
          entityId: entity.id,
          count,
          ...(on && { on: on.id }),
          ...(loop && { loop: loop.id }),
          ...(trigger && { trigger: trigger.map(toBoGroup) }),
        },
      ]
    : [];

const toBoAnchor = (condition?: ResolvedBuildOrderCondition): BoAnchor => {
  if (condition?.type === 'entity') return { kind: 'entity', entityId: condition.entity.id, event: condition.event };
  if (condition?.type === 'timer') return { kind: 'time', seconds: toTimerSeconds(condition.time) };
  if (condition?.type === 'resources') return toResourcesAnchor(condition.resources);
  return { kind: 'after-previous' };
};

// `2:30` = 150.
const toTimerSeconds = (time: string) => {
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * SECONDS_PER_MINUTE + seconds;
};

const toResourcesAnchor = (resources: CostSegment[]): BoAnchor => {
  const hexite = resources.find(({ resource }) => resource === 'hexite');
  const flux = resources.find(({ resource }) => resource === 'flux');
  return {
    kind: 'resources',
    ...(hexite && { hexite: Number(hexite.amount) }),
    ...(flux && { flux: Number(flux.amount) }),
  };
};
