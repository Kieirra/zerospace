import { describe, expect, it } from 'vitest';
import { simulateReal as simulate, toBuild } from './engine.wiki-fixtures.ts';

// Mazar 2026-11-17: every faction starts on a rich Hexite spot (B1), and only the B1.
describe('Rich starting base on the real data', () => {
  it.each([
    ['protectorate', 'protectorate/building/operating-tower'],
    ['grell', 'grell/building/bloomwell'],
    ['the-legion', 'the-legion/building/garrison-tower'],
    ['the-xol', 'the-xol/building/world-engine'],
  ] as const)('should place a %s second base (%s) from 448 Hexite per minute', (factionId, baseId) => {
    const result = simulate(toBuild(factionId, null, [[baseId, 1]]));

    // 150 at the start, 400 needed: 250 / (448 / 60) = 33.5 s.
    expect(result.orders[0].startAt).toBe(33.5);
  });

  // The second base mining at the normal rate: see the World Engine test in engine.factions.test.ts.
});
