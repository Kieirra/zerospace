import { GITHUB_URL } from '../site.constants.ts';

interface IssueContext {
  id: string;
  steamBuildId: string;
  url: string;
}

export const buildIssueUrl = ({ id, steamBuildId, url }: IssueContext) => {
  const params = new URLSearchParams({
    title: `Wrong data: ${id}`,
    body: buildIssueBody({ id, steamBuildId, url }),
  });
  return `${GITHUB_URL}/issues/new?${params}`;
};

const buildIssueBody = ({ id, steamBuildId, url }: IssueContext) =>
  [
    `Entity: ${id}`,
    `Game build: ${steamBuildId}`,
    `Page: ${url}`,
    '',
    'Field:',
    'Shown value:',
    'Correct value:',
    'Source (screenshot, patch notes):',
  ].join('\n');
