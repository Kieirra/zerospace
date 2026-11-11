import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

// The ```bo block is rendered by the build order panel: the guide prose leaves it out.
// Imported by astro.config.mjs and run by Node without transpilation: erasable syntax only.
export const stripBuildOrder: MdastPlugin = {
  name: 'strip-build-order',
  code: (node, context) => {
    if (node.lang === 'bo') context.removeNode(node);
  },
};
