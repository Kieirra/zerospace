import { KIND_COLORS } from '../../build-order.constants.ts';
import { LaneGroup } from '../lane-group/lane-group.tsx';
import { LaneRow } from '../lane-row/lane-row.tsx';
import { ResourceCurve } from '../resource-curve/resource-curve.tsx';
import { SupplySteps } from '../supply-steps/supply-steps.tsx';
import { useTimelineMetrics } from '../timeline.metrics.ts';
import type { ResourceTracks, TimeScale } from '../timeline.types.ts';

interface ResourcesGroupProps {
  tracks: ResourceTracks;
  scale: TimeScale;
}

// Hexite and Flux banks and the free supply, foldable, above the producer lanes.
export const ResourcesGroup = ({ tracks, scale }: ResourcesGroupProps) => {
  const { curveHeight } = useTimelineMetrics();
  return (
    <LaneGroup label="Resources" color="#cfcdd8">
      <LaneRow label="Hexite" summary="bank" height={curveHeight} scale={scale} rightLabel={{ text: tracks.hexite.label, tone: 'muted' }}>
        <ResourceCurve track={tracks.hexite} color={KIND_COLORS.hexite} scale={scale} />
      </LaneRow>
      <LaneRow label="Flux" summary="bank" height={curveHeight} scale={scale} rightLabel={{ text: tracks.flux.label, tone: 'muted' }}>
        <ResourceCurve track={tracks.flux} color={KIND_COLORS.flux} scale={scale} />
      </LaneRow>
      {tracks.supply && (
        <LaneRow label="Supply free" summary="" height={curveHeight} scale={scale} rightLabel={{ text: tracks.supply.label, tone: 'muted' }}>
          <SupplySteps track={tracks.supply} scale={scale} />
        </LaneRow>
      )}
    </LaneGroup>
  );
};
