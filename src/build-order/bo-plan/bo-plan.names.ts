import { toNameKey } from '../catalog/catalog.names.ts';
import type { BuildEntity } from '../build-order.types.ts';
import type { BoCatalogs } from './bo-plan.import.ts';

// Characters the guide parser reads as syntax: a name holding one cannot be written as is.
const SYNTAX_PATTERN = /[()[\]"^+:]|->/;

// How a ```bo block names an entity (Kieirra 2026-11-19): its wiki `name`, never `displayName`; `[kind]` when the name
// is shared on the faction and mercenary sides, as the guide parser resolves it. null when even the kind is not
// enough (two Legion upgrades « Performance Enhancers ») or the name holds syntax: the parser could not read it back.
export const toBoName = (entity: Pick<BuildEntity, 'name' | 'kind'>, { faction, mercenary }: BoCatalogs) => {
  if (SYNTAX_PATTERN.test(entity.name)) return null;
  const key = toNameKey(entity.name);
  const kinds = [...(faction.nameKinds[key] ?? []), ...(mercenary?.nameKinds[key] ?? [])];
  if (kinds.length <= 1) return entity.name;
  return kinds.filter((kind) => kind === entity.kind).length === 1 ? `${entity.name} [${entity.kind}]` : null;
};
