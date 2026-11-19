import { toCapableProducerUids, toLaneProducers } from '../../../build-order.helpers.ts';
import { toLaneId } from '../../../engine/engine.state.ts';
import type { Build, BuildCatalog, BuildEntity } from '../../../build-order.types.ts';
import type { Lane } from '../../../engine/engine.types.ts';

export interface MadeInOption {
  uid: string;
  label: string;
}

// Lanes able to make the step, in lane order, with their timeline label ('Barracks #2'): a unit's producers, or the
// buildings a transformation applies to.
export const toMadeInOptions = (
  entity: BuildEntity,
  build: Pick<Build, 'timed'>,
  catalog: BuildCatalog,
  lanes: Pick<Lane, 'id' | 'label'>[],
): MadeInOption[] => {
  const producers = toLaneProducers(build, catalog);
  const uids =
    entity.category === 'transformation'
      ? producers.filter(({ entity: producer }) => entity.appliesTo.includes(producer.id)).map(({ uid }) => uid)
      : toCapableProducerUids(entity, build, catalog);
  // A building that never starts has no lane yet: its name stands for it.
  const toLabel = (uid: string) =>
    lanes.find(({ id }) => id === toLaneId({ uid }))?.label ?? producers.find((producer) => producer.uid === uid)?.entity.displayName ?? uid;
  return uids.map((uid) => ({ uid, label: toLabel(uid) }));
};
