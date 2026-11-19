import { describe, expect, it } from 'vitest';
import { setQueuedRepeat } from './build-editor.queued.ts';
import type { Build } from '../build-order.types.ts';

const BUILD: Build = {
  version: 3,
  dataVersion: 'test',
  factionId: 'test',
  mercenaryId: null,
  heroId: null,
  title: '',
  author: '',
  timed: [{ uid: 's1', entityId: 'b', at: 0 }],
  queued: [
    { uid: 's2', entityId: 'u', producerUid: 's1' },
    { uid: 's3', entityId: 'u', at: 30 },
  ],
};

describe('Editor queued steps: loop until the end', () => {
  it('should set the loop of the given units, then leave it out when cleared', () => {
    const looped = setQueuedRepeat(BUILD, ['s2', 's3'], true);

    expect(looped.queued).toEqual([
      { uid: 's2', entityId: 'u', producerUid: 's1', repeat: true },
      { uid: 's3', entityId: 'u', at: 30, repeat: true },
    ]);
    expect(setQueuedRepeat(looped, ['s3'], false).queued[1]).toEqual(BUILD.queued[1]);
  });

  it('should keep the same build when nothing changes', () => {
    expect(setQueuedRepeat(BUILD, ['s2'], false)).toBe(BUILD);
    expect(setQueuedRepeat(BUILD, ['s9'], true)).toBe(BUILD);
  });
});
