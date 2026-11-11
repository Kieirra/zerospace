import { describe, expect, it } from 'vitest';
import type { Entity } from '../wiki/wiki.types.ts';
import {
  assertGeneralGuideFields,
  findClosestName,
  getPatchStatus,
  isNewGuide,
  latestPatchNumber,
  resolveTalents,
  toGuideTags,
  toMatchupTags,
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

describe('General guide fields', () => {
  it('should fail when a general guide lists strengths', () => {
    expect(() => assertGeneralGuideFields({ strengths: ['Strong early game.'] })).toThrow(
      'strengths is only allowed in a build order.',
    );
  });

  it('should fail when a general guide lists weaknesses', () => {
    expect(() => assertGeneralGuideFields({ weaknesses: ['Weak against Skrells.'] })).toThrow(
      'weaknesses is only allowed in a build order.',
    );
  });

  it('should accept the guide when no build order field is set', () => {
    expect(() => assertGeneralGuideFields({})).not.toThrow();
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
  it('should list Versus, the match-ups and the style when the guide is a build order', () => {
    expect(toGuideTags({ type: 'build-order', matchupTags: ['LvP', 'LvX'], style: 'one-base' })).toEqual([
      'Versus',
      'LvP',
      'LvX',
      'One base',
    ]);
  });

  it('should only tag Guide when the guide is a general guide', () => {
    expect(toGuideTags({ type: 'guide' })).toEqual(['Guide']);
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
