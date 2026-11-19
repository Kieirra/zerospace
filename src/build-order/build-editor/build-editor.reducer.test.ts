import { describe, expect, it } from 'vitest';
import { BARRACKS, BASE, LAB, RESEARCH, SENTINEL, WORKER, build } from '../engine/engine.fixtures.ts';
import { ARMY, CATALOG, editing, queued, run, timed } from './build-editor.reducer.fixtures.ts';
import { INITIAL_EDITOR_STATE, editorReducer } from './build-editor.reducer.ts';

describe('Editor reducer: build life', () => {
  it('should load a build and forget the last additions', () => {
    expect(editorReducer({ ...editing(ARMY), lastAddedUids: ['s1'] }, { type: 'load', build: ARMY })).toEqual(editing(ARMY));
  });

  it('should create an empty v3 build, and drop it on new (an unreadable link)', () => {
    const created = editorReducer(INITIAL_EDITOR_STATE, { type: 'create', factionId: 'test', mercenaryId: null, heroId: 'h' });

    expect(created.build).toMatchObject({ version: 3, factionId: 'test', heroId: 'h', timed: [], queued: [] });
    expect(editorReducer(created, { type: 'new' })).toBe(INITIAL_EDITOR_STATE);
  });

  it('should reset the steps and keep the sides, the hero, the title and the author', () => {
    const titled = { ...ARMY, heroId: 'h', title: 'Rush', author: 'Mazar' };

    expect(run(titled, { type: 'reset' }).build).toEqual({ ...titled, timed: [], queued: [] });
  });

  it('should keep the state when an action changes nothing', () => {
    const state = editing(ARMY);

    expect(editorReducer(state, { type: 'set-title', title: '' })).toBe(state);
    expect(editorReducer(state, { type: 'shift-at', origins: { s1: 30 }, delta: 0 })).toBe(state);
  });
});

describe('Editor reducer: click times', () => {
  it('should add a timed step held to whole seconds, sorted by time, and remember it', () => {
    const added = run(ARMY, { type: 'add-timed', entityId: LAB.id, at: 35.4 });

    expect(added.build?.timed.map(({ uid, at }) => [uid, at])).toEqual([['s1', 30], ['s8', 35], ['s2', 40], ['s3', 50], ['s4', 60]]);
    expect(added.lastAddedUids).toEqual(['s8']);
  });

  it('should set a time and keep the order canonical', () => {
    expect(run(ARMY, { type: 'set-at', uid: 's2', at: 10 }).build?.timed.map(({ uid }) => uid)).toEqual(['s2', 's1', 's3', 's4']);
  });

  it('should shift every selected step by whole seconds, each one held between 0 and the end', () => {
    const shifted = run(
      ARMY,
      { type: 'shift-at', origins: { s1: 30, s2: 40 }, delta: -35 },
      { type: 'shift-at', origins: { s3: 50 }, delta: 5000 },
    );

    expect(shifted.build?.timed.map(({ uid, at }) => [uid, at])).toEqual([['s1', 0], ['s2', 5], ['s4', 60], ['s3', 1800]]);
  });

  it('should move a step from its origin, not from its click: a delayed building lands at its start plus the seconds', () => {
    const shifted = run(ARMY, { type: 'shift-at', origins: { s2: 52 }, delta: 3 });

    expect(shifted.build?.timed.find(({ uid }) => uid === 's2')?.at).toBe(55);
  });
});

describe('Editor reducer: removal', () => {
  it('should remove a building with its lane: its pinned units and transformations', () => {
    const removed = run(ARMY, { type: 'remove-steps', uids: ['s1', 's3'], catalog: CATALOG });

    expect(removed.build?.timed.map(({ uid }) => uid)).toEqual(['s2']);
    expect(removed.build?.queued.map(({ uid }) => uid)).toEqual(['s6', 's7']);
  });

  it('should then drop the Auto units no building of the build can make', () => {
    const removed = run(ARMY, { type: 'remove-steps', uids: ['s1', 's2'], catalog: CATALOG });

    expect(removed.build?.queued.map(({ uid }) => uid)).toEqual(['s7']);
  });

  it('should keep a step whose required building is removed: it shows the error instead', () => {
    const researched = build([timed('s1', LAB.id, 0), timed('s2', RESEARCH.id, 30)]);

    expect(run(researched, { type: 'remove-steps', uids: ['s1'], catalog: CATALOG }).build?.timed.map(({ uid }) => uid)).toEqual(['s2']);
  });

  it('should drop the steps of the side left and the orphans on a side change', () => {
    const mixed = build([timed('s1', 'merc/building/hall', 10), timed('s2', BARRACKS.id, 20)], [queued('s3', SENTINEL.id)]);
    const changed = run(mixed, { type: 'set-faction', factionId: 'other', heroId: null, catalog: CATALOG });

    expect(changed.build).toMatchObject({ factionId: 'other', timed: [timed('s1', 'merc/building/hall', 10)], queued: [] });
  });
});

describe('Editor reducer: paste and duplicate', () => {
  const clip = { timed: [timed('s1', BARRACKS.id, 30), timed('x', LAB.id, 50)], queued: [queued('s5', SENTINEL.id, 's1')] };

  it('should paste the timed steps at the pointer time with their gaps, units on the hovered lane', () => {
    const pasted = run(ARMY, { type: 'paste-steps', steps: clip, target: { at: 180, laneUid: 's2' }, catalog: CATALOG });

    expect(pasted.build?.timed.slice(-2)).toEqual([timed('s8', BARRACKS.id, 180), timed('s9', LAB.id, 200)]);
    expect(pasted.build?.queued.at(-1)).toEqual(queued('s10', SENTINEL.id, 's2'));
    expect(pasted.lastAddedUids).toEqual(['s8', 's9', 's10']);
  });

  it('should anchor on the latest click without a pointer, and keep the unit lane when the hovered one cannot make it', () => {
    const pasted = run(ARMY, { type: 'paste-steps', steps: clip, target: { at: null, laneUid: 'base' }, catalog: CATALOG });

    expect(pasted.build?.timed.find(({ uid }) => uid === 's8')?.at).toBe(60);
    expect(pasted.build?.queued.at(-1)).toEqual(queued('s10', SENTINEL.id, 's1'));
  });

  it('should skip a research already in the build and count it', () => {
    const researched = build([timed('s1', LAB.id, 0), timed('s2', RESEARCH.id, 30)]);
    const pasted = run(researched, { type: 'paste-steps', steps: { timed: [timed('s2', RESEARCH.id, 30)], queued: [] }, target: { at: 90, laneUid: null }, catalog: CATALOG });

    expect(pasted.build).toBe(researched);
    expect(pasted.skippedCount).toBe(1);
  });

  it('should duplicate in place: same time for a building, a unit right after its original with its pin', () => {
    const duplicated = run(ARMY, { type: 'duplicate-steps', uids: ['s2', 's5'], catalog: CATALOG });

    expect(duplicated.build?.timed.filter(({ at }) => at === 40).map(({ uid }) => uid)).toEqual(['s2', 's8']);
    expect(duplicated.build?.queued.map(({ uid, producerUid }) => [uid, producerUid])).toEqual([['s5', 's1'], ['s9', 's1'], ['s6', undefined], ['s7', 'base']]);
  });

  it('should refuse a copy that passes 200 steps', () => {
    const full = build(Array.from({ length: 200 }, (_, index) => timed(`s${index + 1}`, BASE.id, index)));
    const refused = run(full, { type: 'duplicate-steps', uids: ['s1'], catalog: CATALOG });

    expect(refused.build).toBe(full);
    expect(refused.isFull).toBe(true);
  });

  it('should refuse a 201st step added by a click or a drop', () => {
    const full = build(Array.from({ length: 200 }, (_, index) => timed(`s${index + 1}`, BASE.id, index)));
    const timedRefused = run(full, { type: 'add-timed', entityId: BARRACKS.id, at: 10 });
    const queuedRefused = run(full, { type: 'add-queued', entityId: WORKER.id });

    expect(timedRefused.build).toBe(full);
    expect(timedRefused.isFull).toBe(true);
    expect(queuedRefused.build).toBe(full);
    expect(queuedRefused.isFull).toBe(true);
  });
});
