import { describe, expect, it } from 'vitest';
import type { Entity } from '../wiki.types.ts';
import { getMercenaryChoices, groupByLevel } from './faction-page.helpers.ts';

const talent = (name: string, faction: string, level: number): Entity => ({
  id: `${faction}/talent/${name}`,
  kind: 'talent',
  faction,
  name,
  level,
});

describe('Mercenary talent choices', () => {
  it('should offer the mercenary talents of a level when the faction has a single talent at that level', () => {
    const levels = groupByLevel([
      talent('Koru Symbiosis', 'grell', 1),
      talent('Mycelial Reach', 'grell', 1),
      talent('Rapid Germination', 'grell', 2),
      talent('Pheromone Invigoration', 'grell', 4),
    ]);
    const mercenaryTalents = [talent('Lore of Flux', 'arandi', 2), talent('Blood for Blood', 'chakru-kingdom', 2), talent('Ghostplane Sight', 'arandi', 6)];

    const choices = getMercenaryChoices(levels, mercenaryTalents);

    expect([...choices.keys()]).toEqual([2]);
    expect(choices.get(2)?.map(({ name }) => name)).toEqual(['Blood for Blood', 'Lore of Flux']);
  });
});
