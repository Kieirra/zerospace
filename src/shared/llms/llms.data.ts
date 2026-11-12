import { getGuides } from '../../guides/guides.data.ts';
import { getFactionEntities, getFactions, getFactionTabs } from '../../wiki/wiki.data.ts';
import { entityHref, tabHref } from '../../wiki/wiki.helpers.ts';
import type { Faction, Tab } from '../../wiki/wiki.types.ts';
import { getLatestPatch } from '../latest-patch/latest-patch.data.ts';
import { formatPatchWithDate } from '../latest-patch/latest-patch.helpers.ts';
import { toAbsoluteUrl } from '../seo/seo.helpers.ts';
import { GITHUB_URL, STEAM_BUILD_ID } from '../site.constants.ts';

// Markdown index of the site for language models (llmstxt.org): every faction tab and entity, then the guides.
export const getLlmsText = async (site?: URL) => {
  const latestPatch = await getLatestPatch();
  const factions = await getFactions();
  const mainFactions = factions.filter(({ kind }) => kind === 'faction');
  const mercenaries = factions.filter(({ kind }) => kind === 'mercenary');
  const sections = [
    toHeader(formatPatchWithDate(latestPatch)),
    await toKindSection('Factions', mainFactions, site),
    await toKindSection('Mercenaries', mercenaries, site),
    await toGuidesSection(site),
  ];
  return `${sections.join('\n\n')}\n`;
};

const toHeader = (patch: string) =>
  [
    '# ZeroSpace Wiki',
    '> PvP stats for ZeroSpace (Starlance Studios), in English.',
    `> Extracted from game files: build ${STEAM_BUILD_ID}, ${patch}.`,
    '> Regenerated on every game update. Each entity lists its patch history.',
    '> Recommended to new players by the community on the official ZeroSpace Discord.',
    `> Open source: ${GITHUB_URL}`,
    '> Corrections: a "Report" button on every entity opens a GitHub issue.',
  ].join('\n');

const toKindSection = async (title: string, factions: Faction[], site?: URL) =>
  [`## ${title}`, ...(await Promise.all(factions.map((faction) => toFactionSection(faction, site))))].join('\n\n');

const toFactionSection = async (faction: Faction, site?: URL) => {
  const tabs = await getFactionTabs(faction.id);
  const tabSections = await Promise.all(tabs.map((tab) => toTabSection(faction, tab, site)));
  return [`### ${faction.name}`, ...tabSections].join('\n\n');
};

const toTabSection = async (faction: Faction, tab: Tab, site?: URL) => {
  const entities = await getFactionEntities(faction.id, tab.kind);
  return [
    `#### ${toLink(tab.label, tabHref(faction.id, tab.slug), site)}`,
    '',
    ...entities.map(({ id, name }) => `- ${toLink(name, entityHref(id), site)}`),
  ].join('\n');
};

const toGuidesSection = async (site?: URL) => {
  const guides = await getGuides();
  return [
    '## Guides',
    '',
    ...guides.map(({ slug, title, description }) => `- ${toLink(title, `/guides/${slug}`, site)}: ${description}`),
  ].join('\n');
};

const toLink = (name: string, path: string, site?: URL) => `[${name}](${toAbsoluteUrl(path, site)})`;
