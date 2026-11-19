import type { Entity } from '../../wiki/wiki.types.ts';

// Key of a name as the guide parser reads it (`normalizeName`): trimmed, lower case, single spaces.
export const toNameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Kinds of every wiki entity of a side by name key, topbar and variants included, talents aside: the names a guide
// build order can cite. The export tells by them whether a name needs `[kind]` (Kieirra 2026-11-19).
export const toNameKinds = (sideId: string, entities: Entity[]) => {
  const nameKinds: Record<string, string[]> = {};
  for (const { faction, kind, name } of entities) {
    if (faction !== sideId || kind === 'talent') continue;
    const key = toNameKey(name);
    nameKinds[key] = [...(nameKinds[key] ?? []), kind];
  }
  return nameKinds;
};
