import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import { RESOURCE_AMOUNT_CLASS, RESOURCE_ICON_CLASS, resourceIconUrl, splitResourceWords } from './resource-words.ts';
import type { ResourcePart } from './resource-words.ts';

type HastPlugin = Extract<NonNullable<SatteriProcessorOptions['hastPlugins']>[number], { name: string }>;

const CODE_TAGS = new Set(['code', 'pre']);

const icon = ({ resource, amount }: ResourcePart) => ({
  type: 'element' as const,
  tagName: 'img',
  properties: {
    src: resourceIconUrl(resource),
    // Without its word, the icon carries the resource name.
    alt: amount === undefined ? '' : resource,
    width: 16,
    height: 16,
    className: [...RESOURCE_ICON_CLASS.split(' '), ...(amount === undefined ? ['mr-0.5'] : [])],
  },
  children: [],
});

// "300 hexite" becomes 300 and the icon in a chip, a lone "flux" gets its icon before the word. Code stays as written.
// Erasable syntax only: Node runs it from astro.config.mjs.
export const addResourceIcons: HastPlugin = {
  name: 'add-resource-icons',
  text(node, context) {
    const parent = context.parent(node);
    if (parent?.type === 'element' && CODE_TAGS.has(parent.tagName)) return;
    const parts = splitResourceWords(node.value);
    if (parts.length === 1 && typeof parts[0] === 'string') return;
    context.replaceNode(
      node,
      parts.map((part) =>
        typeof part === 'string'
          ? { type: 'text', value: part }
          : {
              type: 'element',
              tagName: 'span',
              properties: { className: (part.amount === undefined ? 'whitespace-nowrap' : RESOURCE_AMOUNT_CLASS).split(' ') },
              children:
                part.amount === undefined
                  ? [icon(part), { type: 'text', value: part.resource }]
                  : [{ type: 'text', value: part.amount }, icon(part)],
            },
      ),
    );
  },
};
