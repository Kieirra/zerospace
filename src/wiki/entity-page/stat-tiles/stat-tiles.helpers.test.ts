import { describe, expect, it } from 'vitest';
import { toBatchPrefix, toShortLabel, toTileMinWidth } from './stat-tiles.helpers.ts';

describe('Tile labels', () => {
  it('should use the short form when the label is too long for a tile', () => {
    expect(toShortLabel('Research time')).toBe('Research');
    expect(toShortLabel('Armor rating')).toBe('Armor');
    expect(toShortLabel('Armor type')).toBe('Type');
  });

  it('should shorten game stat labels whatever their casing', () => {
    expect(toShortLabel('Energy Cost')).toBe('Energy');
    expect(toShortLabel('Bonus vs Medium')).toBe('vs Medium');
    expect(toShortLabel('Bonus Damage vs Medium')).toBe('vs Medium');
    expect(toShortLabel('Splash Radius')).toBe('Splash');
    expect(toShortLabel('Hexite per 100 XP')).toBe('Hexite/100XP');
  });

  it('should separate the batch size from the batch cost when showing a batch', () => {
    expect(`${toBatchPrefix(3)}75`).toBe('×3 = 75');
  });

  it('should widen the tiles when a label of the set is longer than the default width allows', () => {
    expect(toTileMinWidth(['HP', 'Cost'])).toBe('6.5rem');
    expect(toTileMinWidth(['HP', 'Lifesteal'], true)).toBe('7rem');
  });

  it('should keep the label when it is already short', () => {
    expect(toShortLabel('HP')).toBe('HP');
  });
});
