export interface SearchItem {
  id: string;
  name: string;
  kind: string;
  faction: string;
}

const MAX_RESULTS = 12;

export const searchItems = (items: SearchItem[], query: string) => {
  const needle = normalize(query.trim());
  if (!needle) return [];
  return items
    .map((item) => ({ item, rank: rankMatch(normalize(item.name), needle) }))
    .filter((match): match is { item: SearchItem; rank: number } => match.rank !== undefined)
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
    .slice(0, MAX_RESULTS)
    .map(({ item }) => item);
};

export const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const rankMatch = (name: string, needle: string) => {
  if (name.startsWith(needle)) return 0;
  if (name.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(needle))) return 1;
  if (name.includes(needle)) return 2;
  return undefined;
};

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
