import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { extractBuildOrders } from './guide-page/build-order/build-order.helpers.ts';
import { stripBuildOrder } from './strip-build-order.ts';

const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [stripBuildOrder], syntaxHighlight: false });
const render = async (body: string) => (await processor.render(body)).code;
const markers = (html: string) => [...html.matchAll(/data-bo-branch="(\d+)"/g)].map((match) => Number(match[1]));

const WITH_MAIN = '```bo\n1. Altar\n```\n\n## If they go Skrells\n\n```bo\n1. Armory\n```\n';
const WITHOUT_MAIN = '## Scouting\n\n```bo\n1. Altar\n```\n\n## If they go Skrells\n\n```bo\n1. Armory\n```\n';

describe('Build order blocks in the prose', () => {
  it('should leave the main build order out and mark the branches in place when the body starts with a block', async () => {
    const html = await render(WITH_MAIN);

    expect(html).not.toContain('Altar');
    expect(markers(html)).toEqual([2]);
    expect(html.indexOf('Skrells')).toBeLessThan(html.indexOf('data-bo-branch'));
  });

  it('should mark every block as a branch when text comes before the first block', async () => {
    const html = await render(WITHOUT_MAIN);

    expect(markers(html)).toEqual([1, 2]);
    expect(html.indexOf('Scouting')).toBeLessThan(html.indexOf('data-bo-branch="1"'));
  });

  it('should mark as many branches as the guide resolution reads', async () => {
    for (const body of [WITH_MAIN, WITHOUT_MAIN, '\n\n```bo\n1. Altar\n```\n', '## Economy\n\nSome text.\n']) {
      expect(markers(await render(body))).toHaveLength(extractBuildOrders(body).branches.length);
    }
  });

  it('should read a block indented by 4 spaces as plain code on both sides', async () => {
    const body = '## Scouting\n\n    ```bo\n    1. Altar\n    ```\n';

    expect(markers(await render(body))).toEqual([]);
    expect(extractBuildOrders(body)).toEqual({ branches: [] });
  });

  it.each([
    ['a ~~~ fence', '~~~bo\n1. Armory\n~~~'],
    ['an indented fence', '  ```bo\n  1. Armory\n  ```'],
    ['a fence in a list', '- Scout\n\n  ```bo\n  1. Armory\n  ```'],
    ['a fence in a quote', '> ```bo\n> 1. Armory\n> ```'],
    ['a fence inside another code block', '````md\n```bo\n1. Armory\n```\n````'],
    ['an indented closing fence', '```bo\n1. Armory\n  ```'],
  ])('should fail the build with the block rank when the third block is %s', async (_case, block) => {
    await expect(render(`${WITH_MAIN}\n${block}\n`)).rejects.toThrow(
      'bo block 3: cannot read the block. Open it with "```bo" and close it with "```", each at the start of a line, outside any list, quote or other block.',
    );
  });
});
