import { describe, expect, it } from 'vitest';
import { MERCENARY_MAX_STACKS, STARTING_HEXITE, STARTING_SUPPLY } from './game-data.constants.ts';
import { resolveGameValue, resolveGameValues } from './game-data.helpers.ts';
import type { GameValue } from './game-data.constants.ts';

const gameValue = (fields: Partial<GameValue<number>> = {}): GameValue<number> => ({
  label: 'Test value',
  value: null,
  fallback: null,
  owner: 'Kieirra',
  ...fields,
});

describe('Game value resolution', () => {
  it('should use the confirmed common value', () => {
    expect(resolveGameValue(gameValue({ value: 3, fallback: 1 }), 'protectorate')).toEqual({
      value: 3,
      isProvisional: false,
      label: 'Test value',
    });
  });

  it('should prefer the confirmed value of the side', () => {
    const resolved = resolveGameValue(gameValue({ value: 3, bySide: { grell: 5 } }), 'grell');

    expect(resolved).toMatchObject({ value: 5, isProvisional: false });
  });

  it('should use the fallback as a provisional value', () => {
    expect(resolveGameValue(gameValue({ fallback: 4 }), 'marran')).toMatchObject({ value: 4, isProvisional: true });
  });

  it('should stay unknown when no value nor fallback is declared', () => {
    expect(resolveGameValue(gameValue(), 'marran')).toMatchObject({ value: null, isProvisional: true });
  });

  it('should ignore side values without side', () => {
    expect(resolveGameValue(gameValue({ bySide: { grell: 5 }, fallback: 4 }), null)).toMatchObject({
      value: 4,
      isProvisional: true,
    });
  });

  it('should start with 15 confirmed supply', () => {
    expect(resolveGameValue(STARTING_SUPPLY, 'protectorate')).toEqual({
      value: 15,
      isProvisional: false,
      label: 'Starting supply',
    });
  });

  // PO3 confirmed by Mazar 2026-11-13: 0 / 15 with only the main base, for every faction.
  it.each(['protectorate', 'grell', 'the-xol', 'the-legion'])('should start %s with the same 15 supply (PO3)', (sideId) => {
    expect(resolveGameValue(STARTING_SUPPLY, sideId)).toMatchObject({ value: 15, isProvisional: false });
  });

  it('should start with 150 confirmed Hexite', () => {
    expect(resolveGameValue(STARTING_HEXITE, 'protectorate')).toMatchObject({ value: 150, isProvisional: false });
  });

  it('should allow 4 confirmed mercenary stacks', () => {
    expect(resolveGameValue(MERCENARY_MAX_STACKS, 'marran')).toMatchObject({ value: 4, isProvisional: false });
  });

  it('should resolve every game value for a faction and a mercenary', () => {
    expect(resolveGameValues('protectorate', 'marran')).toMatchObject({
      startingHexite: { value: 150, isProvisional: false },
      startingFlux: { value: 0, isProvisional: false },
      startingHexiteWorkers: { value: 'full', isProvisional: false },
      startingSupply: { value: 15, isProvisional: false },
      supplyCap: { value: 200, isProvisional: false },
      passiveHexitePerMin: { value: 0, isProvisional: false },
      passiveFluxPerMin: { value: 0, isProvisional: false },
      maxFluxNodes: { value: 4, isProvisional: false },
      mercenaryMaxStacks: { value: 4, isProvisional: false },
      mercenaryInitialStacks: { value: 4, isProvisional: true },
      mercenaryStackRechargeSeconds: { value: null, isProvisional: true },
    });
  });
});

describe('Open data points', () => {
  it.todo('PO8: research location when the data gives two buildings or none (RESEARCH_LOCATIONS)');
  it.todo('PO10: production rule of units without producer (Arkanid, Seedling, Valkaru Beast)');
});
