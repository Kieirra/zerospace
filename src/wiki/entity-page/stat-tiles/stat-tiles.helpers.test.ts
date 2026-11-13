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
    expect(toShortLabel('Hexite / min (rich)')).toBe('Rich');
    expect(toShortLabel('Flux / min')).toBe('Income');
  });

  it('should separate the batch size from the batch cost when showing a batch', () => {
    expect(`${toBatchPrefix(3)}75`).toBe('×3 = 75');
  });

  it('should shorten the recently added long labels so the tiles keep their default width', () => {
    expect(toShortLabel('Stun resistance')).toBe('Stun res');
    expect(toShortLabel('Detection range')).toBe('Detect');
    expect(toShortLabel('Shield damage threshold')).toBe('Thresh');
    expect(toShortLabel('Minimum range')).toBe('Min range');
    expect(toShortLabel('Transport slots')).toBe('Slots');
    expect(toShortLabel('Transport units')).toBe('Units');
    expect(toShortLabel('Transport accepts')).toBe('Accepts');
    expect(toTileMinWidth(['Cost', 'HP', 'Regen', 'Stun resistance', 'Transport accepts'])).toBe('6.5rem');
  });

  it('should shorten the hero ability stat labels', () => {
    expect(toShortLabel('Immobilized')).toBe('Immobile');
    expect(toShortLabel('Building Damage')).toBe('vs Bldg');
    expect(toShortLabel('Movement Speed (Water Form)')).toBe('Water move');
  });

  it('should widen the tiles when a label of the set is longer than the default width allows', () => {
    expect(toTileMinWidth(['HP', 'Cost'])).toBe('6.5rem');
    expect(toTileMinWidth(['HP', 'Lifesteal'], true)).toBe('7rem');
  });

  it('should keep the label when it is already short', () => {
    expect(toShortLabel('HP')).toBe('HP');
  });
});
