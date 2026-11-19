import { describe, expect, it } from 'vitest';
import { toClipboardSteps } from './build-editor.clipboard.ts';

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
