import { describe, expect, it } from 'vitest';
import { toMiscEntities, withFactionValues } from '../catalog/catalog.misc.ts';
import { MISC_EVENTS, MISC_TALENTS } from '../game-data/game-data.misc.ts';
import { createSimulationContext, simulateBuild } from './engine.ts';
import { getCatalog, getCatalogWithMisc, entities, sideFiles, toBuild } from './engine.wiki-fixtures.ts';
import type { Amount, MiscEffectSource, MultiplierOf } from '../game-data/game-data.misc.ts';

const LORE_OF_FLUX = 'arandi/talent/lore-of-flux';

const wikiById = new Map(entities.map((entity) => [entity.id, entity]));

const toKeys = (amount: Amount) => (typeof amount === 'number' ? [] : [amount.key]);

const toMultiplierKeys = (multiplier: MultiplierOf) =>
  toKeys('speedPercent' in multiplier ? multiplier.speedPercent : multiplier.reductionPercent);

// Every `{ key }` an effect reads from the wiki values of its talent.
const toValueKeys = (effect: MiscEffectSource): string[] => {
  switch (effect.kind) {
    case 'flux-income':
      return toKeys(effect.percent);
    case 'cost':
    case 'duration':
      return toMultiplierKeys(effect.multiplier);
    case 'spawn-units':
      return toKeys(effect.count);
    case 'building-copies':
      return toKeys(effect.copies);
    default:
      return [];
  }
};

// Every entity id an effect names: targets, units, producers.
const toEntityIds = (effect: MiscEffectSource): string[] => {
  switch (effect.kind) {
    case 'cost':
    case 'duration':
      return effect.target.entityIds ?? [];
    case 'spawn-units':
    case 'building-copies':
      return [effect.entityId];
    case 'spawn-on-finish':
      return effect.trigger.kind === 'recruit-at' ? [effect.entityId, effect.trigger.producerId] : [effect.entityId];
    default:
      return [];
  }
};

const SOURCES = [...Object.values(MISC_TALENTS), ...Object.values(MISC_EVENTS)];

describe('Misc data: talents and events against the wiki', () => {
  it('should name a talent of the wiki for every key of MISC_TALENTS', () => {
    expect(Object.keys(MISC_TALENTS).filter((id) => wikiById.get(id)?.kind !== 'talent')).toEqual([]);
  });

  it('should read only values the wiki gives to its talent', () => {
    const missing = Object.entries(MISC_TALENTS).flatMap(([id, { effects }]) =>
      effects.flatMap(toValueKeys).filter((key) => typeof wikiById.get(id)?.values?.[key] !== 'number').map((key) => `${id} ${key}`),
    );

    expect(missing).toEqual([]);
  });

  it('should name only entities of the wiki in its effects', () => {
    const ids = SOURCES.flatMap(({ effects }) => effects.flatMap(toEntityIds));

    expect(ids.filter((id) => !wikiById.has(id))).toEqual([]);
  });

  it('should give its events to the factions only, each event to a known faction', () => {
    const factionIds = sideFiles.filter(({ kind }) => kind === 'faction').map(({ id }) => id);

    expect(Object.values(MISC_EVENTS).filter(({ sideId }) => sideId !== null && !factionIds.includes(sideId))).toEqual([]);
  });

  it('should build the Misc steps of every side from the wiki', () => {
    const sides = sideFiles.flatMap(({ id }) => toMiscEntities(getCatalog(id).side, entities, () => undefined));
    const steps = withFactionValues(sides, getCatalog('the-legion').entities);

    expect(steps.filter(({ category }) => category === 'talent')).toHaveLength(Object.keys(MISC_TALENTS).length);
    expect(steps.every(({ effectLines = [] }) => effectLines.length > 0 && effectLines.every((line) => !line.includes('{')))).toBe(true);
  });

  // Kieirra 2026-11-20: Lore of Flux fills one Flux node, the Harvesters per node of the faction.
  it.each([
    ['the-legion', 'the-legion/unit/legion-labourer', 3],
    ['the-xol', 'the-xol/unit/xol-harvester', 1],
    ['grell', 'grell/unit/gatherer', 2],
    ['protectorate', 'protectorate/unit/prospector', 2],
  ])('should give the Harvesters per node of %s with Lore of Flux', (factionId, harvesterId, count) => {
    const build = toBuild(factionId, 'arandi', [[LORE_OF_FLUX, 10]]);
    const context = createSimulationContext(build, getCatalogWithMisc(factionId), getCatalogWithMisc('arandi'));

    const result = simulateBuild(build, context);

    expect(result.orders.filter(({ stepUid, entityId }) => stepUid === 'b1' && entityId === harvesterId)).toHaveLength(count);
    expect(context.catalog.get(LORE_OF_FLUX)?.effectLines?.[0]).toBe(`+${count} Harvesters`);
  });
});
