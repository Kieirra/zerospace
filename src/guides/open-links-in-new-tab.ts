import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type HastPlugin = Extract<NonNullable<SatteriProcessorOptions['hastPlugins']>[number], { name: string }>;

// The links of a guide open in a new tab: the reader keeps the guide open. Anchors on the page stay in place.
// Erasable syntax only: Node runs it from astro.config.mjs.
export const openLinksInNewTab: HastPlugin = {
  name: 'open-links-in-new-tab',
  element: {
    filter: ['a'],
    visit(node, context) {
      const href = node.properties?.href;
      if (typeof href !== 'string' || href.startsWith('#')) return;
      context.setProperty(node, 'target', '_blank');
      context.setProperty(node, 'rel', 'noopener');
    },
  },
};
