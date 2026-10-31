import { describe, expect, it } from 'vitest';
import { buildIssueUrl } from './report-button.helpers.ts';

describe('Wrong data report', () => {
  it('should prefill the issue title and body when reporting an entity', () => {
    const url = new URL(
      buildIssueUrl({ id: 'grell/unit/stinger', steamBuildId: '26278122', url: '/wiki/grell/unit/stinger' }),
    );

    expect(url.origin + url.pathname).toBe('https://github.com/kieirra/zerospace/issues/new');
    expect(url.searchParams.get('title')).toBe('Wrong data: grell/unit/stinger');
    expect(url.searchParams.get('body')).toBe(
      [
        'Entity: grell/unit/stinger',
        'Game build: 26278122',
        'Page: /wiki/grell/unit/stinger',
        '',
        'Field:',
        'Shown value:',
        'Correct value:',
        'Source (screenshot, patch notes):',
      ].join('\n'),
    );
  });
});
