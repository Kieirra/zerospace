import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { BARRACKS, COMMANDO, ENTITIES } from '../engine/engine.fixtures.ts';
import { toClipboardSteps, toDuplicatedSteps, toPastedSteps } from './build-editor.clipboard.ts';
import type { Build } from '../build-order.types.ts';

const BUILD = {
  timed: [
    { uid: 's1', entityId: 'b', at: 30 },
    { uid: 's2', entityId: 'b', at: 40 },
  ],
  queued: [
    { uid: 's3', entityId: 'u', producerUid: 's1' },
    { uid: 's4', entityId: 'u' },
  ],
};

describe('Editor clipboard: copy', () => {
  it('should copy the selected steps in their build order, pins and times kept', () => {
    expect(toClipboardSteps(BUILD, new Set(['s4', 's2', 's3']))).toEqual({ timed: [BUILD.timed[1]], queued: BUILD.queued });
  });

  it('should copy nothing for uids no longer in the build', () => {
    expect(toClipboardSteps(BUILD, ['s9'])).toEqual({ timed: [], queued: [] });
  });
});

describe('Editor clipboard: loops', () => {
  const looped: Build = {
    version: 3,
    dataVersion: 'test',
    factionId: 'test',
    mercenaryId: null,
    heroId: null,
    title: '',
    author: '',
    timed: [{ uid: 's1', entityId: BARRACKS.id, at: 0 }],
    queued: [{ uid: 's2', entityId: COMMANDO.id, producerUid: 's1', repeat: true }],
  };
  const catalog = toCatalogMap(ENTITIES);

  it('should keep the loop of a pasted or duplicated unit', () => {
    const pasted = toPastedSteps(looped, toClipboardSteps(looped, ['s2']), { at: null, laneUid: null }, catalog);
    const duplicated = toDuplicatedSteps(looped, ['s2'], catalog);
    const copy = { uid: 's3', entityId: COMMANDO.id, producerUid: 's1', repeat: true };

    expect(pasted.status === 'ok' && pasted.build.queued[1]).toEqual(copy);
    expect(duplicated.status === 'ok' && duplicated.build.queued[1]).toEqual(copy);
  });
});
