import { decodeBuildCode } from '../link/link.codec.ts';
import { formatDataChangedText, readBuildCode } from '../link/link.helpers.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import type { BuildLink, KnownSides, ResolvedBuild, Side } from '../build-order.types.ts';

// What the editor opens: the build of `#b=`, the message of an unreadable link, else the side choice.
type LoadPlan = { kind: 'link'; link: BuildLink } | { kind: 'invalid' } | { kind: 'picker' };

export const toLoadPlan = (hash: string, sides: KnownSides): LoadPlan => {
  const code = readBuildCode(hash);
  if (code === null) return { kind: 'picker' };
  const decoded = decodeBuildCode(code, sides);
  return decoded.status === 'ok' ? { kind: 'link', link: withMercenary(decoded.link, sides) } : { kind: 'invalid' };
};

// An old link without mercenary takes the first one, as New build: no game without a mercenary (Kieirra 2026-11-19).
const withMercenary = (link: BuildLink, sides: KnownSides): BuildLink =>
  link.mercenaryId !== null || !resolveRules(link.factionId).mercenaryRequired.value
    ? link
    : { ...link, mercenaryId: sides.mercenaryIds[0] ?? null };

// Data version of an opened build. The steps dropped on the way leave without a message (Kieirra 2026-11-19).
export const toResolvedNotices = (resolved: ResolvedBuild, currentDataVersion: string) =>
  resolved.isDataVersionChanged ? [formatDataChangedText(resolved.linkDataVersion, currentDataVersion)] : [];

export const toKnownSides = (sides: Side[]): KnownSides => ({
  factionIds: sides.filter(({ kind }) => kind === 'faction').map(({ id }) => id),
  mercenaryIds: sides.filter(({ kind }) => kind === 'mercenary').map(({ id }) => id),
});
