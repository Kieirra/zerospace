import { toBuild } from '../../build-order/bo-plan/bo-plan.import.ts';
import { toSide, toSideEntities } from '../../build-order/catalog/catalog.helpers.ts';
import { encodeBuild } from '../../build-order/link/link.codec.ts';
import { toBoPlan } from './theorycraft-link.helpers.ts';
import type { SideCatalog } from '../../build-order/build-order.types.ts';
import type { Entity, Faction } from '../../wiki/wiki.types.ts';
import type { ResolvedBuildOrder } from '../guides.types.ts';
import type { BoPlanHeader } from './theorycraft-link.helpers.ts';

export interface WikiSources {
  entities: Entity[];
  factions: Map<string, Faction>;
}

// Build of the main build order and its link code, for `Open in Theorycraft`.
export const toTheorycraft = (buildOrder: Pick<ResolvedBuildOrder, 'steps'>, header: BoPlanHeader, sources: WikiSources) => {
  const build = toBuild(toBoPlan(buildOrder, header), {
    faction: getSideCatalog(header.factionId, sources),
    mercenary: header.mercenaryId === null ? null : getSideCatalog(header.mercenaryId, sources),
  });
  return { code: encodeBuild(build), build };
};

// Built once per side for all the guides.
const catalogs = new Map<string, SideCatalog>();

const getSideCatalog = (sideId: string, { entities, factions }: WikiSources) => {
  const cached = catalogs.get(sideId);
  if (cached) return cached;
  const source = factions.get(sideId);
  if (!source) throw new Error(`side ${sideId} is missing from the wiki data.`);
  const side = toSide(source, [...factions.values()]);
  const catalog: SideCatalog = { side, entities: toSideEntities(side, entities, () => undefined) };
  catalogs.set(sideId, catalog);
  return catalog;
};
