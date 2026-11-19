import {
  heroAlreadyPicked,
  heroDuplicate,
  heroNoSlot,
  heroNotBuildable,
  heroNotInPool,
} from './engine.diagnostics.ts';
import { toTicks } from './engine.economy.ts';
import type { Build, BuildEntity } from '../build-order.types.ts';
import type { HeroSlots, SimulationState } from './engine.internal.types.ts';
import type { Diagnostic, SimulationContext } from './engine.types.ts';

// Setup hero (free, never an order) and paid hero slots (Kieirra 2026-11-19: the Legion has 2, so 3 heroes).
export const resolveHeroSlots = (build: Build, context: SimulationContext): HeroSlots => {
  const { setupHeroAtSeconds, paidHeroSlots } = context.rules.heroes;
  const hero = getSetupHeroEntity(build, context);
  return {
    setup: hero ? { entityId: hero.id, at: setupHeroAtSeconds.value, supply: hero.supply } : null,
    maxSlots: paidHeroSlots.value,
  };
};

export const getHeroDiagnostics = (build: Build, context: SimulationContext): Diagnostic[] =>
  build.heroId !== null && !getSetupHeroEntity(build, context)
    ? [heroNotInPool(context.rules.heroes.setupHeroAtSeconds.value)]
    : [];

// heroUids: paid heroes already analysed, entity id → step uid; its size is the hero rank minus one.
// The setup hero takes one of the heroes of a faction: '3 heroes at most' counts it.
export const checkHeroStep = (
  entity: BuildEntity,
  slots: HeroSlots,
  heroUids: Map<string, string>,
): { diagnostic?: Diagnostic; isIgnored: boolean; firstUid?: string } => {
  if (slots.maxSlots === 0) return { diagnostic: heroNotBuildable(), isIgnored: true };
  if (slots.setup?.entityId === entity.id) return { diagnostic: heroAlreadyPicked(slots.setup.at), isIgnored: true };
  const firstUid = heroUids.get(entity.id);
  if (firstUid !== undefined) return { diagnostic: heroDuplicate(), isIgnored: true, firstUid };
  if (heroUids.size + 1 > slots.maxSlots) return { diagnostic: heroNoSlot(slots.maxSlots + 1), isIgnored: false };
  return { isIgnored: false };
};

// Phase 1: the setup hero joins at its time, never held by the supply cap.
export const spawnSetupHero = (state: SimulationState) => {
  if (state.setupHero && state.tick === toTicks(state.setupHero.at)) state.supplyUsed += state.setupHero.supply;
};

export const getSetupHeroTick = (state: SimulationState) => (state.setupHero ? toTicks(state.setupHero.at) : 0);

const getSetupHeroEntity = (build: Build, context: SimulationContext) =>
  build.heroId !== null && context.heroPoolIds.includes(build.heroId) ? context.catalog.get(build.heroId) : undefined;
