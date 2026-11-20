import { formatClock, toCatalogMap } from '../build-order.helpers.ts';
import { REPLICATE_NAME, REPLICATE_TOPBAR_ID } from '../game-data/game-data.constants.ts';
import { toBoName } from './bo-plan.names.ts';
import type { BoCatalogs } from './bo-plan.import.ts';
import type { BoAnchor, BoGroup, BoItem, BoPlan } from './bo-plan.types.ts';

// The ```bo block of a plan, fences included, ready to paste in a guide (Kieirra 2026-11-19): one line per group, a
// phase line `N.` then `-> …` lines, no goal. A name the guide parser could not read back is written as text, between
// quotes, with its display name: the reader still sees it, a guide keeps it as a note. A copy is `Replicate (on X)`.
export const printBoPlan = (plan: BoPlan, catalogs: BoCatalogs) => {
  const catalog = toCatalogMap([...catalogs.faction.entities, ...(catalogs.mercenary?.entities ?? [])]);
  const toName = (entityId: string) => {
    const entity = catalog.get(entityId);
    if (entityId === REPLICATE_TOPBAR_ID) return REPLICATE_NAME;
    if (!entity) return `"${entityId}"`;
    return toBoName(entity, catalogs) ?? `"${entity.displayName.replaceAll('"', "'")}"`;
  };
  const printAnchor = (anchor: BoAnchor) => {
    if (anchor.kind === 'time') return `when ${formatClock(anchor.seconds)}: `;
    if (anchor.kind === 'entity') return `when ${toName(anchor.entityId)} ${anchor.event}: `;
    return '';
  };
  const printItem = ({ entityId, count, on, loop, trigger }: BoItem): string =>
    [
      `${count > 1 ? `${count} ` : ''}${toName(entityId)}`,
      on === undefined ? '' : ` (on ${toName(on)})`,
      loop === undefined ? '' : ` (loop ${toName(loop)})`,
      trigger === undefined ? '' : ` (-> ${trigger.map(printGroup).join(' -> ')})`,
    ].join('');
  const printGroup = ({ anchor, items }: BoGroup) => `${printAnchor(anchor)}${items.map(printItem).join(' + ')}`;
  const lines = plan.phases.flatMap(({ number, groups }) =>
    groups.map((group, index) => (index === 0 ? `${number}. ${printGroup(group)}` : `   -> ${printGroup(group)}`)),
  );
  return ['```bo', ...lines, '```'].join('\n');
};
