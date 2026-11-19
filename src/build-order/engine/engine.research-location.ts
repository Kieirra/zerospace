import type { BuildEntity } from '../build-order.types.ts';

// Only place that decides where a research is launched (PO8).
export const getResearchLocation = (
  upgrade: BuildEntity,
  catalog: ReadonlyMap<string, Pick<BuildEntity, 'kind'>>,
  overrides: Record<string, string>,
) => {
  const override = overrides[upgrade.id];
  if (override) return override;
  if (upgrade.transformsInto) return upgrade.appliesTo[0];
  const buildings = upgrade.requires.filter((id) => catalog.get(id)?.kind === 'building');
  return buildings.length === 1 ? buildings[0] : undefined;
};
