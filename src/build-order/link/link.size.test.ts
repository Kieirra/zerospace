import { describe, expect, it } from 'vitest';
import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { encodeBuild } from './link.codec.ts';
import type { Build } from '../build-order.types.ts';

const toBuild = (stepCount: number): Build => ({
  version: 3,
  dataVersion: STEAM_BUILD_ID,
  factionId: 'protectorate',
  mercenaryId: 'marran',
  heroId: 'protectorate/hero/prefect-aster',
  title: 'Sentinel push into Cyclops',
  author: 'Mazar',
  timed: Array.from({ length: stepCount / 4 }, (_, index) => ({ uid: `t${index}`, entityId: 'protectorate/building/barracks', at: 30 + index * 7 })),
  queued: Array.from({ length: (stepCount * 3) / 4 }, (_, index) => ({
    uid: `q${index}`,
    entityId: 'protectorate/unit/sentinel',
    ...(index % 3 === 0 ? { producerUid: `t${index % (stepCount / 4)}` } : {}),
  })),
});

describe('Link v3: size', () => {
  it('should keep a realistic 40-step build under 1000 characters', () => {
    expect(encodeBuild(toBuild(40)).length).toBeLessThan(1000);
  });

  it('should keep the longest allowed build (200 steps) under 6000 characters', () => {
    expect(encodeBuild(toBuild(200)).length).toBeLessThan(6000);
  });
});
