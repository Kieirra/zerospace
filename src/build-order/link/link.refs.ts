import type { BuildEntity } from '../build-order.types.ts';

// `{m?}{k}.{slug}` from an entity id `{side}/{kind}/{slug}`; null when the id has another shape.
export const toEntityRef = (entityId: string, factionId: string) => {
  const [sideId, kind, slug, ...rest] = entityId.split('/');
  const letter = KIND_LETTERS[kind as BuildEntity['kind']];
  if (!letter || !slug || rest.length > 0) return null;
  return `${sideId === factionId ? '' : 'm'}${letter}.${slug}`;
};

// Entity id of a ref; null when the ref is unreadable or names a mercenary entity without mercenary.
export const parseEntityRef = (ref: string, factionId: string, mercenaryId: string | null) => {
  const match = REF_PATTERN.exec(ref);
  if (!match) return null;
  const [, mercenaryPrefix, letter, slug] = match;
  const sideId = mercenaryPrefix ? mercenaryId : factionId;
  return sideId === null ? null : `${sideId}/${LETTER_KINDS[letter]}/${slug}`;
};

const KIND_LETTERS: Record<BuildEntity['kind'], string> = { building: 'b', unit: 'u', hero: 'h', upgrade: 'r' };
const LETTER_KINDS: Record<string, BuildEntity['kind']> = { b: 'building', u: 'unit', h: 'hero', r: 'upgrade' };
const REF_PATTERN = /^(m?)([buhr])\.([^/]+)$/;
