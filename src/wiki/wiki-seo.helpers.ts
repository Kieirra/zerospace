import type { BreadcrumbItem } from '../shared/seo/seo.helpers.ts';
import { SITE_NAME } from '../shared/site.constants.ts';
import { KIND_LABELS, TABS } from './wiki.constants.ts';
import {
  entityHref,
  formatEnergyCost,
  formatOptionalDistance,
  formatOptionalNumber,
  formatOptionalSeconds,
  formatUnitCost,
  tabHref,
} from './wiki.helpers.ts';
import type { Entity, Faction, Tab } from './wiki.types.ts';

export interface GameVersion {
  build: string;
  label: string;
}

const WIKI_NAME = `${SITE_NAME} Wiki`;

export const toWikiTitle = ({ label }: GameVersion) => `${WIKI_NAME} · Units, buildings, heroes, talents (${label})`;

export const toFactionTabTitle = (faction: Faction, tab: Tab, { label }: GameVersion) =>
  `${faction.name} ${tab.label.toLowerCase()} · ${WIKI_NAME} (${label})`;

export const toEntityTitle = (entity: Entity, factionName: string, { label }: GameVersion) =>
  `${entity.name} · ${factionName} ${toKindWord(entity)} stats · ${WIKI_NAME} (${label})`;

export const describeWiki = (factions: Faction[], version: GameVersion) => {
  const factionCount = factions.filter(({ kind }) => kind === 'faction').length;
  const mercenaryCount = factions.length - factionCount;
  const kinds = TABS.map(({ label }) => label.toLowerCase());
  const kindList = `${kinds.slice(0, -1).join(', ')} and ${kinds.at(-1)}`;
  return `${capitalize(kindList)} of the ${factionCount} factions and ${mercenaryCount} mercenaries. ${describeSource(version)}`;
};

export const describeFactionTab = (faction: Faction, tab: Tab, count: number, version: GameVersion) =>
  `${count} ${faction.name} ${(count === 1 ? KIND_LABELS[tab.kind] : tab.label).toLowerCase()}. ${describeSource(version)}`;

// "Reaver, Grell unit. Cost 200 hexite and 100 flux, 900 HP, range 1.75. Values from game build ... (Update #18)."
export const describeEntity = (entity: Entity, factionName: string, version: GameVersion) => {
  const tier = entity.tier?.match(/\d+/)?.[0];
  const identity = `${entity.name}, ${factionName} ${tier ? `tier ${tier} ` : ''}${toKindWord(entity)}.`;
  const facts = toEntityFacts(entity);
  return [identity, facts.length > 0 && `${capitalize(facts.join(', '))}.`, describeSource(version)]
    .filter(Boolean)
    .join(' ');
};

export const toFactionTabBreadcrumb = (faction: Faction, tab: Tab): BreadcrumbItem[] => [
  { name: 'Wiki', path: '/wiki' },
  { name: faction.name, path: tabHref(faction.id, TABS[0].slug) },
  { name: tab.label, path: tabHref(faction.id, tab.slug) },
];

export const toEntityBreadcrumb = (entity: Entity, faction: Faction): BreadcrumbItem[] => {
  const tab = TABS.find(({ kind }) => kind === entity.kind) ?? TABS[0];
  return [...toFactionTabBreadcrumb(faction, tab), { name: entity.name, path: entityHref(entity.id) }];
};

const describeSource = ({ build, label }: GameVersion) => `Values from game build ${build} (${label}).`;

const toEntityFacts = (entity: Entity) => {
  const cost = formatUnitCost(entity);
  const hp = formatOptionalNumber(entity.hp);
  const range = formatOptionalDistance(entity.range ?? entity.weapons?.[0]?.range);
  const energyCost = typeof entity.energyCost === 'number' ? formatEnergyCost(entity.energyCost) : undefined;
  const cooldown = formatOptionalSeconds(entity.cooldown);
  const level = formatOptionalNumber(entity.level);
  return [
    level && `level ${level}`,
    cost && `cost ${cost.map(({ amount, resource }) => `${amount} ${resource}`).join(' and ')}`,
    hp && `${hp} HP`,
    range && `range ${range}`,
    energyCost && `energy cost ${energyCost}`,
    cooldown && `cooldown ${cooldown}`,
  ].filter((fact) => fact !== undefined);
};

const toKindWord = ({ kind }: Entity) => KIND_LABELS[kind].toLowerCase();

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
