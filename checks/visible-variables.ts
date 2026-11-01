// Lists the {variables} left visible in the text of the built pages (dist/), scripts and styles excluded.
// Run after `pnpm build`; exits with 1 when a page shows a raw variable.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const NON_TEXT = /<(script|style)\b[\s\S]*?<\/\1>/gi;
const TAG = /<[^>]+>/g;
const VARIABLE = /\{[^{}\s][^{}]*\}/g;

const main = () => {
  const findings = listHtmlFiles(DIST).flatMap((file) =>
    [...new Set(toVisibleText(readFileSync(file, 'utf8')).match(VARIABLE) ?? [])].map((variable) => ({
      page: file.slice(DIST.length).replace(/index\.html$/, ''),
      variable,
    })),
  );
  for (const { page, variable } of findings) console.log(`${page} ${variable}`);
  console.log(`${findings.length} visible variable(s) on ${new Set(findings.map(({ page }) => page)).size} page(s)`);
  process.exitCode = findings.length > 0 ? 1 : 0;
};

const listHtmlFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });

const toVisibleText = (html: string) => html.replace(NON_TEXT, ' ').replace(TAG, ' ');

main();
