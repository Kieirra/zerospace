import { describe, expect, it } from 'vitest';
import { simulateReal, toBuild } from './engine.wiki-fixtures.ts';

// Pools confirmed by Mazar (memory « Règles des héros »), written out to check the real data independently.
const MERCENARY_HEROES: Record<string, string> = {
  arandi: 'arandi/hero/iolin',
  'chakru-kingdom': 'chakru-kingdom/hero/loikru',
  endari: 'endari/hero/umbra',
  'free-corsairs': 'free-corsairs/hero/yearl',
  marran: 'marran/hero/hel',
  valkaru: 'valkaru/hero/mondar-and-torq',
};

const OWN_HEROES: Record<string, string[]> = {
  protectorate: ['protectorate/hero/prefect-aster', 'protectorate/hero/marv', 'protectorate/hero/mera'],
  grell: ['grell/hero/vynthra', 'grell/hero/marv', 'grell/hero/mera'],
  'the-xol': ['the-xol/hero/anrubic'],
  'the-legion': ['the-legion/hero/kraegar', 'the-legion/hero/inquisitress', 'the-legion/hero/galavax'],
};

const ALL_HEROES = [...Object.values(OWN_HEROES).flat(), ...Object.values(MERCENARY_HEROES)];

const expectedPool = (factionId: string, mercenaryId: string | null) => [
  ...OWN_HEROES[factionId],
  ...(mercenaryId && factionId !== 'the-legion' ? [MERCENARY_HEROES[mercenaryId]] : []),
];

describe('Heroes: setup pools of the real data', () => {
  const cases = Object.keys(OWN_HEROES).flatMap((factionId) =>
    [null, ...Object.keys(MERCENARY_HEROES)].map((mercenaryId) => [factionId, mercenaryId] as const),
  );

  it.each(cases)('should accept only the confirmed pool when %s plays with %s', (factionId, mercenaryId) => {
    const pool = expectedPool(factionId, mercenaryId);

    const accepted = ALL_HEROES.filter(
      (heroId) => simulateReal({ ...toBuild(factionId, mercenaryId, []), heroId }).heroes.setup !== null,
    );

    expect(accepted.sort()).toEqual([...pool].sort());
  });
});
