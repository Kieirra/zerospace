import { describe, expect, it } from 'vitest';
import { toHealTitle } from './entity-heals.helpers.ts';

describe('Heal titles', () => {
  it('should keep the heal name when it differs from the entity name', () => {
    expect(toHealTitle({ name: 'Healing Wave', amount: 50, radius: 300 }, "Loi'kru")).toBe('Healing Wave');
  });

  it('should call it an aura when it is named after the entity and has a radius without duration', () => {
    expect(toHealTitle({ name: 'Hauler', perSecond: 8, radius: 1000 }, 'Hauler')).toBe('Aura');
  });

  it('should give no title when it is named after the entity and nothing tells what it is', () => {
    expect(toHealTitle({ name: 'Hauler', perSecond: 6, duration: 10 }, 'Hauler')).toBeUndefined();
  });
});
