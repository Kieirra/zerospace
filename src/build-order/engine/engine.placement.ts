import { canProduce, toLaneProducers, toStepKind } from '../build-order.helpers.ts';
import { missingProducer, unknownProducer, unknownResearchLocation, wrongProducer } from './engine.diagnostics.ts';
import { getResearchLocation } from './engine.research-location.ts';
import type { LaneProducer } from '../build-order.helpers.ts';
import type { Build, BuildCatalog, BuildEntity } from '../build-order.types.ts';
import type { Thread } from './engine.internal.types.ts';
import type { Diagnostic, SimulationContext } from './engine.types.ts';

interface Placement {
  producerIds: string[];
  thread?: Thread;
  // Pinned lane kept: it exists and can take the order.
  producerUid?: string;
}

// What the whole build holds, whatever the times: its lanes, and the buildings and forms a requirement may name.
export interface BuildScope {
  lanes: LaneProducer[];
  available: Set<string>;
}

export const toBuildScope = (build: Build, catalog: BuildCatalog): BuildScope => {
  const lanes = toLaneProducers(build, catalog);
  return { lanes, available: new Set(lanes.flatMap(({ entity, transformedInto }) => [entity.id, ...transformedInto])) };
};

// Without a producer in the data or in the build, the order stays outside any thread (shown on the base lane). A merge
// or a Replicate copy has none by design (US-009): its lane is the one of its inputs.
export const resolvePlacement = (
  entity: BuildEntity,
  producerUid: string | undefined,
  context: SimulationContext,
  scope: BuildScope,
  diagnostics: Diagnostic[],
): Placement => {
  if (entity.category === 'merge' || entity.category === 'replicate') return { producerIds: [] };
  if (toStepKind(entity) === 'queued') {
    if (entity.producedBy.length === 0) {
      diagnostics.push(unknownProducer());
      return { producerIds: [] };
    }
    const capable = scope.lanes.filter((lane) => canProduce(entity, lane.entity, lane.transformedInto));
    if (capable.length === 0) return toMissing(entity.producedBy, context, diagnostics);
    return { producerIds: entity.producedBy, thread: 'production', producerUid: toPinnedUid(producerUid, capable, scope, diagnostics) };
  }
  if (entity.category !== 'research' && entity.category !== 'transformation') return { producerIds: [] };
  const location = getResearchLocation(entity, context.catalog, context.values.researchLocations);
  if (location === undefined) {
    diagnostics.push(unknownResearchLocation());
    return { producerIds: [] };
  }
  const isTransformation = entity.category === 'transformation';
  const capable = scope.lanes.filter(
    (lane) => lane.entity.id === location || (!isTransformation && lane.transformedInto.includes(location)),
  );
  if (capable.length === 0) return toMissing([location], context, diagnostics);
  return {
    producerIds: [location],
    thread: 'research',
    producerUid: isTransformation ? toPinnedUid(producerUid, capable, scope, diagnostics) : undefined,
  };
};

export const toNames = (ids: string[], catalog: BuildCatalog) => ids.map((id) => catalog.get(id)?.name ?? id);

const toMissing = (producerIds: string[], context: SimulationContext, diagnostics: Diagnostic[]): Placement => {
  diagnostics.push(missingProducer(toNames(producerIds, context.catalog)));
  return { producerIds: [] };
};

// A lane that cannot take the order is an error; the order then goes to Auto. A lane gone is dropped silently.
const toPinnedUid = (producerUid: string | undefined, capable: LaneProducer[], scope: BuildScope, diagnostics: Diagnostic[]) => {
  if (producerUid === undefined || capable.some(({ uid }) => uid === producerUid)) return producerUid;
  const lane = scope.lanes.find(({ uid }) => uid === producerUid);
  if (lane) diagnostics.push(wrongProducer(lane.entity.name));
  return undefined;
};
