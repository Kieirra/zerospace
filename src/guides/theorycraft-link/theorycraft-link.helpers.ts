import { isBuildableEntity } from '../../build-order/catalog/catalog.helpers.ts';
import { SECONDS_PER_MINUTE } from '../../build-order/engine/engine.constants.ts';
import type { BoAnchor, BoGroup, BoItem, BoPlan } from '../../build-order/bo-plan/bo-plan.types.ts';
import type { CostSegment } from '../../wiki/wiki.types.ts';
import type {
  ResolvedBuildOrder,
  ResolvedBuildOrderCondition,
  ResolvedBuildOrderGroup,
  ResolvedBuildOrderItem,
} from '../guides.types.ts';

export type BoPlanHeader = Omit<BoPlan, 'phases'>;

// Lost on the way: free text, notes, goals, and the entities the tool cannot build (topbar). A free text condition is `->`.
export const toBoPlan = ({ steps }: Pick<ResolvedBuildOrder, 'steps'>, header: BoPlanHeader): BoPlan => ({
  ...header,
  phases: steps.map(({ number, groups }) => ({ number, groups: groups.map(toBoGroup) })),
});

const toBoGroup = ({ condition, items }: ResolvedBuildOrderGroup): BoGroup => ({
  anchor: toBoAnchor(condition),
  items: items.flatMap(toBoItems),
});

const toBoItems = ({ entity, count, loop, trigger }: ResolvedBuildOrderItem): BoItem[] =>
  entity && isBuildableEntity(entity)
    ? [
        {
          entityId: entity.id,
          count,
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
