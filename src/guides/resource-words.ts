import { WIKI_IMAGES_PATH } from '../shared/site.constants.ts';

export type ResourceWord = 'hexite' | 'flux' | 'supply';

export interface ResourcePart {
  resource: ResourceWord;
  // "300" or "50 to 100": the word is dropped, the icon follows the amount.
  amount?: string;
}

// Lowercase only: a capitalised word is part of a name (Lore of Flux, Supply Platform).
const RESOURCE_PATTERN = /\b(?:(\d+(?: to \d+)?) )?(hexite|flux|supply)\b/g;

// Classes shared by the markdown plugin and the Astro component.
export const RESOURCE_ICON_CLASS = 'resource-icon inline-block size-[1em] max-w-none align-[-0.15em]';
export const RESOURCE_AMOUNT_CLASS = 'inline-flex items-center gap-1 bg-surface-raised px-1.5 font-label font-semibold whitespace-nowrap tabular-nums';

export const resourceIconUrl = (resource: ResourceWord) => `${WIKI_IMAGES_PATH}/icons/${resource}.webp`;

// The text cut around each resource word, with the amount written before it.
// Erasable syntax only: Node runs it from astro.config.mjs.
export const splitResourceWords = (text: string) => {
  const parts: (string | ResourcePart)[] = [];
  let last = 0;
  for (const match of text.matchAll(RESOURCE_PATTERN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [, amount, resource] = match;
    parts.push(amount === undefined ? { resource: resource as ResourceWord } : { resource: resource as ResourceWord, amount });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};
