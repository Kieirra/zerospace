import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

const BLOCK_PATTERN = /^```bo[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;

// Rendered HTML of a branch marker, split by the guide page.
export const BRANCH_MARKER_PATTERN = /<div data-bo-branch="\d+"><\/div>/;

// Leaves the main build order out of the prose (the panel renders it) and swaps each branch for a marker.
// An unmatched bo node (~~~bo, indented, in a list...) would shift the branches: it fails the build. Erasable syntax only: Node runs it from astro.config.mjs.
export const stripBuildOrder: MdastPlugin = {
  name: 'strip-build-order',
  options: { position: true },
  before: (_root, context) => {
    context.data.buildOrderBlocks = { ...findBuildOrderBlocks(context.source), nodes: [] };
  },
  code: (node, context) => {
    if (node.lang !== 'bo') return;
    const { hasMain, nodes } = context.data.buildOrderBlocks as BuildOrderBlocks;
    const blockNumber = nodes.push({ offset: node.position?.start.offset, source: node.value });
    if (blockNumber === 1 && hasMain) context.removeNode(node);
    else context.replaceNode(node, { type: 'html', value: `<div data-bo-branch="${blockNumber}"></div>` });
  },
  after: (_root, context) => {
    const { blocks, nodes } = context.data.buildOrderBlocks as BuildOrderBlocks;
    const count = Math.max(blocks.length, nodes.length);
    for (let index = 0; index < count; index++) {
      const block = blocks[index];
      const node = nodes[index];
      if (block?.offset !== node?.offset || block?.source !== node?.source)
        throw new Error(
          `bo block ${index + 1}: cannot read the block. Open it with "\`\`\`bo" and close it with "\`\`\`", each at the start of a line, outside any list, quote or other block.`,
        );
    }
  },
};

// Each ```bo block of a guide body, read the same way by this plugin and by the guide resolution.
// The first block is the main build order only when nothing but blank lines comes before it.
export const findBuildOrderBlocks = (body: string) => {
  const blocks = [...body.matchAll(BLOCK_PATTERN)].map((match) => ({
    offset: match.index,
    source: match[1].replace(/\r?\n$/, ''),
  }));
  return { blocks, hasMain: blocks.length > 0 && body.slice(0, blocks[0].offset).trim() === '' };
};

type BuildOrderBlocks = ReturnType<typeof findBuildOrderBlocks> & {
  // The bo code nodes read by the parser, to check them against the blocks.
  nodes: { offset?: number; source: string }[];
};
