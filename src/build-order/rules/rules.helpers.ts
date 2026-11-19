import { BASE_RULES, FACTION_RULES } from './rules.data.ts';
import type { GameRules, RuleOverrides } from './rules.data.ts';

// Base rules with the faction overrides, merged rule by rule.
export const resolveRules = (factionId: string): GameRules => {
  const overrides: RuleOverrides = FACTION_RULES[factionId] ?? {};
  return {
    startPriority: overrides.startPriority ?? BASE_RULES.startPriority,
    reservation: overrides.reservation ?? BASE_RULES.reservation,
    requiresMode: { ...BASE_RULES.requiresMode, ...overrides.requiresMode },
    mercenaryAllowed: overrides.mercenaryAllowed ?? BASE_RULES.mercenaryAllowed,
    mercenaryBuildingCopies: overrides.mercenaryBuildingCopies ?? BASE_RULES.mercenaryBuildingCopies,
    heroes: { ...BASE_RULES.heroes, ...overrides.heroes },
  };
};
