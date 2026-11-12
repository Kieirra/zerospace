import type { PatchNote } from '../../wiki/wiki-data.types.ts';
import { byNewestPatch } from '../../wiki/wiki.helpers.ts';

type PatchNoteSummary = Pick<PatchNote, 'id' | 'label' | 'date' | 'url'>;

// Label of the hotfixes, shared by many patch notes: their date tells them apart.
const HOTFIX_LABEL = 'Patch';

// Most recent patch note by date, the highest id breaking a tie (same order as getPatchNotes).
export const findLatestPatch = (patches: PatchNoteSummary[]) => {
  const [latest] = [...patches].sort(byNewestPatch);
  if (!latest) throw new Error('data/patch-notes has no patch note.');
  return { label: toPatchLabel(latest), date: latest.date, url: latest.url };
};

// "Update #18 (2026-11-03)", or "Patch 2026-11-20" when the label already gives the date.
export const formatPatchWithDate = ({ label, date }: Pick<PatchNote, 'label' | 'date'>) =>
  label.endsWith(date) ? label : `${label} (${date})`;

const toPatchLabel = ({ label, date }: PatchNoteSummary) => (label === HOTFIX_LABEL ? `${label} ${date}` : label);
