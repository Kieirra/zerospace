import { describe, expect, it } from 'vitest';
import type { Entity } from '../wiki/wiki.types.ts';
import {
  assertFieldDependencies,
  findClosestName,
  getPatchStatus,
  isNewGuide,
  latestPatchNumber,
  resolveTalents,
  toGuideTags,
  toMatchupTags,
  toReadingMinutes,
} from './guides.helpers.ts';

const talent = (name: string, faction: string, level: number, position: string): Entity => ({
  id: `${faction}/talent/${name}`,
  kind: 'talent',
  faction,
  name,
  level,
  position,
});

const LEGION_TALENTS = [
  talent('War Experience', 'the-legion', 1, 'A'),
  talent('Improved Conduits', 'the-legion', 1, 'B'),
  talent('Efficient Upgrades', 'the-legion', 2, 'A'),
  talent('Summoning Obelisk', 'the-legion', 3, 'A'),
  talent('Trifecta', 'the-legion', 3, 'B'),
  talent('Improved Spellcasting', 'the-legion', 4, 'A'),
  talent('Ritual', 'the-legion', 5, 'A'),
  talent('Spawn Monolith', 'the-legion', 5, 'B'),
  talent('Unending Army', 'the-legion', 6, 'A'),
  talent('Resource Warfare', 'the-legion', 7, 'A'),
  talent('The Stars in Our Reach', 'the-legion', 7, 'B'),
];
const ARANDI_TALENTS = [
  talent('Lore of Flux', 'arandi', 2, 'A'),
  talent('Ghostplane Sight', 'arandi', 4, 'A'),
  talent('Penumbra Ascendant', 'arandi', 6, 'A'),
];
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

describe('Patch status', () => {
  it('should be current when the guide is on the latest patch', () => {
    expect(getPatchStatus(18, 18)).toBe('current');
  });

  it('should be previous when the guide is one patch behind', () => {
    expect(getPatchStatus(17, 18)).toBe('previous');
  });

  it('should be outdated when the guide is two patches behind or more', () => {
    expect(getPatchStatus(16, 18)).toBe('outdated');
    expect(getPatchStatus(13, 18)).toBe('outdated');
  });
});

describe('New guide', () => {
  const added = '2026-11-01';
  const addedAt = Date.parse(`${added}T00:00:00Z`);

  it('should be new when the guide was added 6 days and 23 hours ago', () => {
    expect(isNewGuide(added, new Date(addedAt + 6 * DAY_MS + 23 * HOUR_MS))).toBe(true);
  });

  it('should not be new when the guide was added 7 days ago', () => {
    expect(isNewGuide(added, new Date(addedAt + 7 * DAY_MS))).toBe(false);
  });
});

describe('Field dependencies', () => {
  it('should accept the guide when no optional field is set', () => {
    expect(() => assertFieldDependencies({}, false)).not.toThrow();
  });

  it('should accept the guide when a bo block has a faction and no other field', () => {
    expect(() => assertFieldDependencies({ faction: 'the-legion' }, true)).not.toThrow();
  });

  it('should fail when the mercenary is set without faction', () => {
    expect(() => assertFieldDependencies({ mercenary: 'arandi' }, false)).toThrow('mercenary requires faction.');
  });

  it('should fail when the hero is set without faction', () => {
    expect(() => assertFieldDependencies({ hero: 'Galavax' }, false)).toThrow('hero requires faction.');
  });

  it('should fail when the army is set without faction', () => {
    expect(() => assertFieldDependencies({ army: ['Exalted'] }, false)).toThrow('army requires faction.');
  });

  it('should fail when the talents are set without faction', () => {
    expect(() => assertFieldDependencies({ talents: '1222211' }, false)).toThrow('talents requires faction.');
  });

  it('should fail when the talents are set without mercenary', () => {
    expect(() => assertFieldDependencies({ faction: 'the-legion', talents: '1222211' }, false)).toThrow(
      'talents requires mercenary.',
    );
  });

  it('should fail when the guide has a bo block without faction', () => {
    expect(() => assertFieldDependencies({}, true)).toThrow('a bo block requires faction.');
  });
});

describe('Matchup tags', () => {
  it('should list the opponents in P, G, L, X order when vs keys are unordered', () => {
    expect(toMatchupTags('the-legion', ['the-xol', 'protectorate', 'grell'])).toEqual(['LvP', 'LvG', 'LvX']);
  });

  it('should tag the mirror when the guide faction plays against itself', () => {
    expect(toMatchupTags('the-legion', ['the-legion'])).toEqual(['LvL']);
  });
});

describe('Guide tags', () => {
  it('should list Versus, the match-ups and the style when both are set', () => {
    expect(toGuideTags({ matchupTags: ['LvP', 'LvX'], style: 'one-base' })).toEqual(['Versus', 'LvP', 'LvX', 'One base']);
  });

  it('should only list Versus and the match-ups when the style is not set', () => {
    expect(toGuideTags({ matchupTags: ['PvG'] })).toEqual(['Versus', 'PvG']);
  });

  it('should only list the style when there is no match-up', () => {
    expect(toGuideTags({ matchupTags: [], style: 'expand' })).toEqual(['Expand']);
  });

  it('should only tag Guide when there is no other tag', () => {
    expect(toGuideTags({ matchupTags: [] })).toEqual(['Guide']);
  });
});

describe('Talents', () => {
  it('should pick the top talents and the mercenary ones when the code is 1212111', () => {
    const talents = resolveTalents('1212111', LEGION_TALENTS, ARANDI_TALENTS);

    expect(talents.map(({ name }) => name)).toEqual([
      'War Experience',
      'Lore of Flux',
      'Summoning Obelisk',
      'Ghostplane Sight',
      'Ritual',
      'Unending Army',
      'Resource Warfare',
    ]);
  });

  it('should pick the bottom talents and the mercenary ones when the code is 1222211', () => {
    const talents = resolveTalents('1222211', LEGION_TALENTS, ARANDI_TALENTS);

    expect(talents.map(({ name }) => name)).toEqual([
      'War Experience',
      'Lore of Flux',
      'Trifecta',
      'Ghostplane Sight',
      'Spawn Monolith',
      'Unending Army',
      'Resource Warfare',
    ]);
  });

  it('should fail when a level has no talent at the chosen position', () => {
    const mercenaryTalentsWithoutLevel6 = ARANDI_TALENTS.filter(({ level }) => level !== 6);

    expect(() => resolveTalents('1111121', LEGION_TALENTS, mercenaryTalentsWithoutLevel6)).toThrow(
      'talents: no talent at level 6 position B.',
    );
  });
});

describe('Latest patch', () => {
  it('should keep the highest update number when labels mix updates and patches', () => {
    expect(latestPatchNumber(['Update #16', 'Patch', 'Update #18', 'Update #17'])).toBe(18);
  });
});

describe('Name suggestion', () => {
  it('should suggest Bestiary when the name is Bestairy', () => {
    expect(findClosestName('Bestairy', ['Altar', 'Bestiary', 'Citadel'])).toBe('Bestiary');
  });

  it('should suggest nothing when every name is more than 3 edits away', () => {
    expect(findClosestName('Mammoth', ['Altar', 'Bestiary', 'Citadel'])).toBeUndefined();
  });
});

describe('Reading time', () => {
  it('counts 220 words per minute', () => {
    expect(toReadingMinutes(Array.from({ length: 660 }, () => 'word').join(' '))).toBe(3);
  });

  it('reads a short guide in 1 minute', () => {
    expect(toReadingMinutes('## Title\n\nA few words.')).toBe(1);
  });
});
