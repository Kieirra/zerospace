import { describe, expect, it } from 'vitest';
import {
  describeEntity,
  describeFactionTab,
  toEntityBreadcrumb,
  toEntityTitle,
  toFactionTabBreadcrumb,
  toFactionTabTitle,
} from './wiki-seo.helpers.ts';
import type { Entity, Faction, Tab } from './wiki.types.ts';

const VERSION = { build: '26399317', label: 'Update #18' };
const GRELL: Faction = { id: 'grell', kind: 'faction', name: 'Grell' };
const ARANDI: Faction = { id: 'arandi', kind: 'faction', name: 'Arandi' };
const HEROES: Tab = { slug: 'heroes', kind: 'hero', label: 'Heroes' };

const reaver: Entity = {
  id: 'grell/unit/reaver',
  kind: 'unit',
  faction: 'grell',
  name: 'Reaver',
  cost: { hexite: 200, flux: 100 },
  hp: 900,
  weapons: [{ name: 'Colossal Scythes', range: 175 }],
};

describe('Wiki SEO', () => {
  it('should give the faction, the kind and the patch when titling an entity page', () => {
    expect(toEntityTitle(reaver, 'Grell', VERSION)).toBe('Reaver · Grell unit stats · ZeroSpace Wiki (Update #18)');
  });

  it('should give the faction and the tab when titling a faction tab', () => {
    expect(toFactionTabTitle(GRELL, { slug: 'units', kind: 'unit', label: 'Units' }, VERSION)).toBe(
      'Grell units · ZeroSpace Wiki (Update #18)',
    );
  });

  it('should list the cost, HP and weapon range when describing a unit', () => {
    expect(describeEntity(reaver, 'Grell', VERSION)).toBe(
      'Reaver, Grell unit. Cost 200 hexite and 100 flux, 900 HP, range 1.75. Values from game build 26399317 (Update #18).',
    );
  });

  it('should omit the missing stats and give the tier when describing a talent', () => {
    const talent: Entity = {
      id: 'valkaru/talent/pulverizers',
      kind: 'talent',
      faction: 'valkaru',
      name: 'Pulverizers',
      tier: 'T3',
    };

    expect(describeEntity(talent, 'Valkaru', VERSION)).toBe(
      'Pulverizers, Valkaru tier 3 talent. Values from game build 26399317 (Update #18).',
    );
  });

  it('should go from the wiki to the entity through its faction and tab when building the entity breadcrumb', () => {
    expect(toEntityBreadcrumb(reaver, GRELL)).toEqual([
      { name: 'Wiki', path: '/wiki' },
      { name: 'Grell', path: '/wiki/grell/units' },
      { name: 'Units', path: '/wiki/grell/units' },
      { name: 'Reaver', path: '/wiki/grell/unit/reaver' },
    ]);
  });

  it('should link the faction to its first tab, not to its redirect, when building the faction tab breadcrumb', () => {
    expect(toFactionTabBreadcrumb(ARANDI, HEROES)).toEqual([
      { name: 'Wiki', path: '/wiki' },
      { name: 'Arandi', path: '/wiki/arandi/units' },
      { name: 'Heroes', path: '/wiki/arandi/heroes' },
    ]);
  });

  it('should use the singular kind when describing a faction tab with a single entity', () => {
    expect(describeFactionTab(ARANDI, HEROES, 1, VERSION)).toBe(
      '1 Arandi hero. Values from game build 26399317 (Update #18).',
    );
  });

  it('should use the plural tab label when describing a faction tab with several entities', () => {
    expect(describeFactionTab(ARANDI, HEROES, 3, VERSION)).toBe(
      '3 Arandi heroes. Values from game build 26399317 (Update #18).',
    );
  });
});
