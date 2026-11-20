import { interpolate } from '../../wiki/wiki.helpers.ts';
import { MISC_EVENTS, MISC_SIDE_ID, MISC_TALENTS } from '../game-data/game-data.misc.ts';
import type { DescriptionValues, Entity } from '../../wiki/wiki.types.ts';
import type { BuildEntity, MiscEffect, Side } from '../build-order.types.ts';
import type { Amount, MiscEffectSource, MiscEventSource, MiscSource, MultiplierOf } from '../game-data/game-data.misc.ts';

// Misc steps of a side (US-008): its talents of MISC_TALENTS, then, for a faction, the events of every faction and its own.
export const toMiscEntities = (
  side: Pick<Side, 'id' | 'kind'>,
  entities: Entity[],
  findImageUrl: (id: string) => string | undefined,
): BuildEntity[] => [
  ...entities
    .filter((entity) => entity.kind === 'talent' && entity.faction === side.id && entity.id in MISC_TALENTS)
    .map((talent) => toTalentEntity(talent, MISC_TALENTS[talent.id], findImageUrl(talent.id))),
  ...(side.kind === 'faction'
    ? Object.entries(MISC_EVENTS)
        .filter(([, source]) => source.sideId === null || source.sideId === side.id)
        .map(([id, source]) => toEventEntity(id, source, entities))
    : []),
];

const toTalentEntity = (talent: Entity, source: MiscSource, imageUrl?: string): BuildEntity => ({
  ...toMiscFields(talent.id, talent.faction, 'talent', talent.name),
  imageUrl,
  level: talent.level,
  effectLines: source.lines.map((line) => interpolate(line, talent.values)),
  effects: resolveEffects(source.effects, talent.values ?? {}, talent.id),
});

// The supply line of a Reinforcements is the supply of its units, never written by hand; the engine waits for it.
const toEventEntity = (id: string, source: MiscEventSource, entities: Entity[]): BuildEntity => {
  const effects = resolveEffects(source.effects, {}, id);
  const groupSupply = toGroupSupply(effects, entities);
  return {
    ...toMiscFields(id, source.sideId ?? MISC_SIDE_ID, 'event', source.name),
    effectLines: source.lines.map((line) => interpolate(line, { supply: groupSupply })),
    effects,
    groupSupply,
  };
};

// Data supply is per unit.
const toGroupSupply = (effects: MiscEffect[], entities: Entity[]) =>
  effects.reduce((total, effect) => {
    if (effect.kind !== 'spawn-units' || !effect.waitsForSupply) return total;
    return total + (entities.find(({ id }) => id === effect.entityId)?.supply ?? 0) * effect.count;
  }, 0);

// A value missing from the wiki stops the build: a number of the game is never guessed.
const resolveEffects = (sources: MiscEffectSource[], values: DescriptionValues, id: string): MiscEffect[] =>
  sources.map((source) => {
    const read = (amount: Amount) => readAmount(amount, values, id);
    switch (source.kind) {
      case 'flux-income':
        return { ...source, percent: read(source.percent) };
      case 'cost':
      case 'duration':
        return { ...source, multiplier: toMultiplier(source.multiplier, read) };
      case 'spawn-units':
        return { ...source, count: read(source.count) };
      case 'building-copies':
        return { ...source, copies: read(source.copies) };
      case 'production-charges':
        return {
          kind: source.kind,
          entityIds: source.entityIds,
          maxDelta: read(source.maxDelta),
          rechargeMultiplier: toMultiplier(source.recharge, read),
        };
      default:
        return source;
    }
  });

const toMiscFields = (id: string, sideId: string, kind: 'talent' | 'event', name: string): BuildEntity => ({
  id,
  sideId,
  kind,
  category: kind,
  name,
  displayName: name,
  cost: { hexite: 0, flux: 0 },
  count: 1,
  supply: 0,
  duration: 0,
  producedBy: [],
  requires: [],
  appliesTo: [],
  isVariant: false,
});

const readAmount = (amount: Amount, values: DescriptionValues, id: string) => {
  if (typeof amount === 'number') return amount;
  const value = values[amount.key];
  if (typeof value !== 'number') throw new Error(`Misc step ${id}: no number "${amount.key}" in its wiki values.`);
  return value;
};

const toMultiplier = (multiplier: MultiplierOf, read: (amount: Amount) => number) =>
  'speedPercent' in multiplier ? 1 / (1 + read(multiplier.speedPercent) / 100) : 1 - read(multiplier.reductionPercent) / 100;

// Lines that depend on the faction, filled when the faction and the mercenary sides meet: a mercenary talent's free
// Harvesters are the Harvesters per node of the faction (Lore of Flux).
export const withFactionValues = (entities: BuildEntity[], factionEntities: BuildEntity[]): BuildEntity[] => {
  const economy = factionEntities.find(({ category }) => category === 'harvester')?.economy;
  if (economy?.kind !== 'flux-harvester') return entities;
  const values = { harvestersPerNode: economy.harvestersPerNode };
  return entities.map((entity) =>
    entity.effectLines ? { ...entity, effectLines: entity.effectLines.map((line) => interpolate(line, values)) } : entity,
  );
};
