import { describe, expect, it } from 'vitest';
import { HORIZON_SECONDS } from './engine.constants.ts';
import { simulateReal } from './engine.wiki-fixtures.ts';
import type { Build } from '../build-order.types.ts';

const EXALTED = 'the-legion/unit/exalted';
const ARMORY = 'the-legion/building/armory';

// CA5: 1 Bestiary, an Exalted in a loop pinned on it, an Armory clicked at 2:00 (with what the Armory needs).
const BUILD: Build = {
  version: 3,
  dataVersion: 'test',
  factionId: 'the-legion',
  mercenaryId: null,
  heroId: null,
  title: '',
  author: '',
  timed: [
    { uid: 's1', entityId: 'the-legion/building/idal-conduit', at: 0 },
    { uid: 's2', entityId: 'the-legion/building/bestiary', at: 0 },
    { uid: 's3', entityId: 'the-legion/building/citadel', at: 0 },
    { uid: 's4', entityId: ARMORY, at: 120 },
  ],
  queued: [
    { uid: 's5', entityId: EXALTED, producerUid: 's2', repeat: true },
    { uid: 's6', entityId: 'the-legion/unit/legion-labourer' },
    { uid: 's7', entityId: 'the-legion/unit/legion-labourer' },
  ],
};

describe('Loop on the real data (CA5)', () => {
  const result = simulateReal(BUILD);
  const exalted = result.orders.filter(({ stepUid }) => stepUid === 's5');
  const armory = result.orders.find(({ entityId }) => entityId === ARMORY);

  it('should make Exalted one after the other on the Bestiary until the end of the Armory', () => {
    const armoryEnd = armory?.endAt ?? Number.NaN;
    const last = exalted.at(-1);

    expect(exalted.map(({ occurrence }) => occurrence)).toEqual(exalted.map((_, index) => index));
    expect(exalted.every(({ laneId }) => laneId === 'lane:s2')).toBe(true);
    expect(exalted.slice(1).every(({ startAt }, index) => startAt === exalted[index].endAt)).toBe(true);
    expect(last?.startAt ?? Number.NaN).toBeLessThan(armoryEnd);
    expect(last?.endAt ?? Number.NaN).toBeGreaterThan(armoryEnd);
  });

  it('should finish the Exalted in production at the end of the Armory, make no other one, and end the simulation', () => {
    expect(exalted.every(({ startAt }) => startAt !== null)).toBe(true);
    expect(result.endTime).toBe(exalted.at(-1)?.endAt);
    expect(result.samples.at(-1)?.t).toBeLessThan(HORIZON_SECONDS);
  });
});
