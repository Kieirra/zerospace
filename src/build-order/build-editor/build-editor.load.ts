import { decodeBuildCode } from '../link/link.codec.ts';
import { formatDataChangedText, formatDroppedText, readBuildCode } from '../link/link.helpers.ts';
import type { BuildLink, KnownSides, ResolvedBuild, Side } from '../build-order.types.ts';

// What the editor opens: the build of `#b=`, the message of an unreadable link, else the side choice.
type LoadPlan = { kind: 'link'; link: BuildLink } | { kind: 'invalid' } | { kind: 'picker' };

export const toLoadPlan = (hash: string, sides: KnownSides): LoadPlan => {
  const code = readBuildCode(hash);
  if (code === null) return { kind: 'picker' };
  const decoded = decodeBuildCode(code, sides);
  return decoded.status === 'ok' ? { kind: 'link', link: decoded.link } : { kind: 'invalid' };
};

// Data version and dropped steps of an opened build.
export const toResolvedNotices = (resolved: ResolvedBuild, currentDataVersion: string) => [
  ...(resolved.isDataVersionChanged ? [formatDataChangedText(resolved.linkDataVersion, currentDataVersion)] : []),
  ...(resolved.droppedStepCount > 0 ? [formatDroppedText(resolved.droppedStepCount)] : []),
];

export const toKnownSides = (sides: Side[]): KnownSides => ({
  factionIds: sides.filter(({ kind }) => kind === 'faction').map(({ id }) => id),
  mercenaryIds: sides.filter(({ kind }) => kind === 'mercenary').map(({ id }) => id),
});
