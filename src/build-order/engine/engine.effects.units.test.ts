import { describe, expect, it } from 'vitest';
import {
  BARRACKS,
  COMMANDO,
  ENTITIES,
  HARVESTER,
  LAB,
  SUPPLY_PLATFORM,
  building,
  codesOf,
  context,
  entity,
  freeUnitTimes,
  known,
  miscEntity,
  orderOf,
  recruit,
  simulate,
  stepOf,
  unit,
  values,
} from './engine.fixtures.ts';
import type { BuildEntity, QueuedStep } from '../build-order.types.ts';

// A Thrall order is one unit of 1 supply here.
const THRALL = entity('unit/thrall', { supply: 1, duration: 5, producedBy: [BARRACKS.id] });
const VAULT = entity('building/war-vault', { kind: 'building', category: 'mercenary-building', duration: 10 });
// A recruit of 4 Hounds, 2 supply each.
const HOUND = entity('unit/hound', { category: 'mercenary-unit', supply: 8, count: 4, duration: 0, producedBy: [VAULT.id] });
const RAIDER = entity('unit/raider', { category: 'mercenary-unit', supply: 2, duration: 0, producedBy: [VAULT.id] });
const UNENDING_ARMY = miscEntity('talent/unending-army', 'talent', [
  { kind: 'spawn-on-finish', entityId: THRALL.id, trigger: { kind: 'faction-unit' } },
]);
const HOUNDS_OF_WAR = miscEntity('talent/hounds-of-war', 'talent', [
  { kind: 'spawn-on-finish', entityId: HOUND.id, trigger: { kind: 'recruit-at', producerId: VAULT.id } },
]);
const THEY_WRITHE = miscEntity('talent/they-writhe', 'talent', [{ kind: 'spawn-units', entityId: THRALL.id, count: 4, waitsForSupply: false }]);
// Commando: 2 supply, so 12 for the group.
const REINFORCEMENTS = miscEntity(
  'event/reinforcements-commando',
  'event',
  [{ kind: 'spawn-units', entityId: COMMANDO.id, count: 6, waitsForSupply: true }],
  { groupSupply: 12 },
);

const ENTRENCHED_HIDEOUTS = miscEntity('talent/entrenched-hideouts', 'talent', [{ kind: 'building-copies', entityId: VAULT.id, copies: 3 }]);

const MISC_ENTITIES: BuildEntity[] = [THRALL, VAULT, HOUND, RAIDER, UNENDING_ARMY, HOUNDS_OF_WAR, THEY_WRITHE, REINFORCEMENTS, ENTRENCHED_HIDEOUTS];

const loop = (entityId: string, producerUid: string): QueuedStep => ({ ...unit(entityId, producerUid), repeat: true });

// A Lab clicked at 0:34: the last step outside the loop ends at 0:54.
const LAST_STEP_AT = 34;

const withSupply = (startingSupply: number | null) =>
  context({
    entities: [...ENTITIES, ...MISC_ENTITIES],
    values: values({ startingHexite: known(1000), startingSupply: startingSupply === null ? values().startingSupply : known(startingSupply) }),
  });

describe('Misc steps: free units of a talent (CA5)', () => {
  it('should spawn a Thrall per faction unit made after Unending Army, over the cap, and hold the next paid unit', () => {
    const talent = building(UNENDING_ARMY.id, 0);
    const thralls = [unit(THRALL.id), unit(THRALL.id), unit(THRALL.id)];

    const result = simulate([building(BARRACKS.id, 0), talent], [unit(HARVESTER.id), ...thralls], withSupply(3));

    expect(freeUnitTimes(result, talent)).toEqual([
      [THRALL.id, 35],
      [THRALL.id, 40],
    ]);
    expect(result.supply).toEqual({ used: 4, cap: 3, isChecked: true });
    expect(stepOf(result, thralls[2]).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'never-starts', message: 'Never starts: no supply left (4/3).' }),
    );
  });

  it('should spawn a Hound per recruit of its building when Hounds of War is taken', () => {
    const talent = building(HOUNDS_OF_WAR.id, 0);

    const result = simulate([building(VAULT.id, 0), talent], [recruit(RAIDER.id)], withSupply(null));

    expect(freeUnitTimes(result, talent)).toEqual([[HOUND.id, 10]]);
    expect(result.supply.used).toBe(4);
  });

  it('should spawn every unit of the talent at its time when they need no free supply', () => {
    const talent = building(THEY_WRITHE.id, 20);

    const result = simulate([talent], [], withSupply(0));

    expect(freeUnitTimes(result, talent)).toEqual(Array(4).fill([THRALL.id, 20]));
    expect(result.supply.used).toBe(4);
  });
});

describe('Misc steps: Reinforcements (CA6, CA error)', () => {
  it('should spawn the whole group once a building frees enough supply', () => {
    const event = building(REINFORCEMENTS.id, 10);

    const result = simulate([building(SUPPLY_PLATFORM.id, 0), event], [], withSupply(4));

    expect(stepOf(result, event)).toMatchObject({ clickAt: 10, startAt: 30, endAt: 30, diagnostics: [] });
    expect(orderOf(result, event).waits).toEqual({ supply: 20 });
    expect(freeUnitTimes(result, event)).toEqual(Array(6).fill([COMMANDO.id, 30]));
    expect(result.supply.used).toBe(12);
  });

  it('should never apply and give the supply of the group when no supply ever comes', () => {
    const event = building(REINFORCEMENTS.id, 10);

    const result = simulate([event], [], withSupply(4));

    expect(stepOf(result, event)).toMatchObject({ startAt: null, endAt: null });
    expect(stepOf(result, event).diagnostics).toEqual([
      { code: 'never-applies', severity: 'error', message: 'Never applies: not enough free supply for 12.', stepUid: event.uid },
    ]);
    expect(freeUnitTimes(result, event)).toEqual([]);
  });

  it('should spawn the group at its time when the supply is not checked', () => {
    const event = building(REINFORCEMENTS.id, 10);

    const result = simulate([event], [], withSupply(null));

    expect(stepOf(result, event)).toMatchObject({ startAt: 10 });
    expect(result.supply.used).toBe(12);
  });
});

describe('Misc steps: mercenary building copies', () => {
  it('should accept a second mercenary building only when a talent of the build allows more', () => {
    const second = building(VAULT.id, 20);

    const without = simulate([building(VAULT.id, 0), second], [], withSupply(null));
    const withTalent = simulate([building(VAULT.id, 0), second, building(ENTRENCHED_HIDEOUTS.id, 60)], [], withSupply(null));

    expect(codesOf(without, second)).toContain('duplicate-mercenary-building');
    expect(codesOf(withTalent, second)).not.toContain('duplicate-mercenary-building');
  });
});

describe('Misc steps: loops', () => {
  it('should spawn a Thrall for every copy of a loop when Unending Army is taken', () => {
    const talent = building(UNENDING_ARMY.id, 0);
    const thralls = loop(THRALL.id, 'barracks');

    const result = simulate([building(BARRACKS.id, 0, 'barracks'), building(LAB.id, LAST_STEP_AT), talent], [thralls], withSupply(null));

    expect(freeUnitTimes(result, talent)).toEqual([35, 40, 45, 50, 55].map((at) => [THRALL.id, at]));
  });

  it('should stop a loop at the end of the last queued step when a Misc step comes later', () => {
    const thralls = loop(THRALL.id, 'barracks');
    const late = building(THEY_WRITHE.id, 200);

    const result = simulate([building(BARRACKS.id, 0, 'barracks'), building(LAB.id, LAST_STEP_AT), late], [thralls], withSupply(null));

    expect(result.orders.filter(({ stepUid }) => stepUid === thralls.uid).map(({ endAt }) => endAt)).toEqual([35, 40, 45, 50, 55]);
    expect(stepOf(result, late).startAt).toBe(200);
  });
});
