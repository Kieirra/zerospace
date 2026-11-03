import type { PatchNote, PatchNoteEntry } from '../../wiki-data.types.ts';

export interface EntityUpdate {
  patch: PatchNote;
  entries: PatchNoteEntry[];
}

// Patches that concern an entity, most recent first, with their entries for it in the order of the post.
export const toEntityUpdates = (entityId: string, patches: PatchNote[]) =>
  patches
    .map(
      (patch): EntityUpdate => ({
        patch,
        entries: patch.sections.flatMap(({ entries }) => entries.filter(({ entityIds }) => entityIds.includes(entityId))),
      }),
    )
    .filter(({ entries }) => entries.length > 0)
    .sort((a, b) => b.patch.date.localeCompare(a.patch.date));

// The subject is shown when it names something else than the entity ("Overclock" on the Synapse).
// A subject that ends the entity name also names it ("Harvester" on the Xol Harvester).
export const shouldShowSubject = (subject: string | null, entityName: string): subject is string =>
  subject !== null && !namesEntity(normalizeName(subject), normalizeName(entityName));

// Entries about the entity itself first, then the ones under a subject, each group in the order of the post.
export const sortEntriesForEntity = (entries: PatchNoteEntry[], entityName: string) => [
  ...entries.filter(({ subject }) => !shouldShowSubject(subject, entityName)),
  ...entries.filter(({ subject }) => shouldShowSubject(subject, entityName)),
];

const namesEntity = (subject: string, entityName: string) =>
  subject === entityName || entityName.endsWith(` ${subject}`);

const normalizeName = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
