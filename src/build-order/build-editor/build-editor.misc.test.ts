import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { getCatalogWithMisc, toBuild } from '../engine/engine.wiki-fixtures.ts';
import { resolveRules } from '../rules/rules.helpers.ts';
import { countSideSteps, toOnceRuleReason } from './build-editor.helpers.ts';
import { run } from './build-editor.reducer.fixtures.ts';

const GUARDS = 'misc/event/tower-xp-creeps';
const REINFORCEMENTS = 'misc/event/reinforcements-commando';
const ENTRENCHED_HIDEOUTS = 'free-corsairs/talent/entrenched-hideouts';
const OUTPOST = 'free-corsairs/building/free-corsair-mercenary-outpost';

// Entities of the sides with their Misc steps, as the editor loads them.
const catalogOf = (...sideIds: string[]) => toCatalogMap(sideIds.flatMap((sideId) => getCatalogWithMisc(sideId).entities));

const PROTECTORATE = catalogOf('protectorate', 'free-corsairs');
const RULES = resolveRules('protectorate');

const entityOf = (entityId: string) => {
  const entity = PROTECTORATE.get(entityId);
  if (!entity) throw new Error(`Unknown entity ${entityId}`);
  return entity;
};

const reasonOf = (entityId: string, othersIds: string[]) =>
  toOnceRuleReason(entityOf(entityId), othersIds.map(entityOf), { heroId: null }, RULES);

describe('Editor: Misc steps allowed once (US-008)', () => {
  it('should refuse a talent already in the build and never limit an event', () => {
    expect(reasonOf(ENTRENCHED_HIDEOUTS, [ENTRENCHED_HIDEOUTS])).toBe('Already in the build.');
    expect(reasonOf(GUARDS, [GUARDS, GUARDS, GUARDS, GUARDS])).toBeNull();
  });

  it('should allow the Outposts the talent of the build gives when Entrenched Hideouts is in it', () => {
    expect(reasonOf(OUTPOST, [OUTPOST])).toBe('Only one per match.');
    expect(reasonOf(OUTPOST, [ENTRENCHED_HIDEOUTS, OUTPOST, OUTPOST])).toBeNull();
    expect(reasonOf(OUTPOST, [ENTRENCHED_HIDEOUTS, OUTPOST, OUTPOST, OUTPOST])).toBe('Only 3 per match.');
  });
});

describe('Editor: Misc steps on a side change (US-008)', () => {
  const build = toBuild('protectorate', 'free-corsairs', [
    [GUARDS, 30],
    [REINFORCEMENTS, 60],
    [ENTRENCHED_HIDEOUTS, 90],
  ]);

  it('should count the Reinforcements with the faction and the talent with the mercenary, never the guards', () => {
    expect(countSideSteps(build, 'protectorate', PROTECTORATE)).toBe(1);
    expect(countSideSteps(build, 'free-corsairs', PROTECTORATE)).toBe(1);
  });

  it('should keep the guards and drop the Reinforcements when the faction changes', () => {
    const changed = run(build, { type: 'set-faction', factionId: 'the-legion', heroId: null, catalog: PROTECTORATE });

    expect(changed.build?.timed.map(({ entityId }) => entityId)).toEqual([GUARDS, ENTRENCHED_HIDEOUTS]);
  });

  it('should drop the talent of the mercenary when the mercenary changes', () => {
    const changed = run(build, { type: 'set-mercenary', mercenaryId: 'arandi', heroId: null, catalog: PROTECTORATE });

    expect(changed.build?.timed.map(({ entityId }) => entityId)).toEqual([GUARDS, REINFORCEMENTS]);
  });
});
