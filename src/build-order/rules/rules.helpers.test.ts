import { describe, expect, it } from 'vitest';
import { BASE_RULES } from './rules.data.ts';
import { resolveRules } from './rules.helpers.ts';

describe('Game rules', () => {
  it('should apply The Legion hero overrides on top of the base rules', () => {
    const rules = resolveRules('the-legion');

    expect(rules.heroes.paidHeroSlots.value).toBe(2);
    expect(rules.heroes.mercenaryHeroInPool.value).toBe(false);
    expect(rules.heroes.setupHeroAtSeconds).toEqual(BASE_RULES.heroes.setupHeroAtSeconds);
    expect(rules.startPriority.value).toEqual(['mercenary-unit', 'base', 'supply', 'unit', 'other']);
  });

  it('should use the base rules for a faction without override', () => {
    expect(resolveRules('protectorate')).toEqual(BASE_RULES);
  });
});
