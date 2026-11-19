import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { BARRACKS, BASE, ENTITIES, LAB, RESEARCH, SENTINEL, SUPPLY_PLATFORM, TRANSFORMATION, WORKER, entity } from '../engine/engine.fixtures.ts';
import { INITIAL_EDITOR_STATE, editorReducer } from './build-editor.reducer.ts';
import type { Build, QueuedStep, TimedStep } from '../build-order.types.ts';
import type { EditorAction, EditorState } from './build-editor.reducer.ts';

const ALTAR = entity('building/altar', { kind: 'building', category: 'building' });
const KRAEGAR = entity('hero/kraegar', { kind: 'hero', category: 'hero', producedBy: [ALTAR.id] });
const CATALOG = toCatalogMap([...ENTITIES, ALTAR, KRAEGAR]);

const build = (timed: TimedStep[], queued: QueuedStep[] = [], fields: Partial<Build> = {}): Build => ({
  version: 3,
  dataVersion: 'test',
  factionId: 'test',
  mercenaryId: null,
  heroId: null,
  title: '',
  author: '',
  timed,
  queued,
  ...fields,
});

const timed = (uid: string, entityId: string, at: number, producerUid?: string): TimedStep => ({
  uid,
  entityId,
  at,
  ...(producerUid === undefined ? {} : { producerUid }),
});
const queued = (uid: string, entityId: string, producerUid?: string): QueuedStep => ({
  uid,
  entityId,
  ...(producerUid === undefined ? {} : { producerUid }),
});

const editing = (value: Build): EditorState => ({ ...INITIAL_EDITOR_STATE, build: value });
const run = (value: Build, ...actions: EditorAction[]) => actions.reduce(editorReducer, editing(value));

// Two Barracks with a Sentinel each, workers on the base, a supply platform turned into a turret.
const ARMY = build(
  [timed('s1', BARRACKS.id, 30), timed('s2', BARRACKS.id, 40), timed('s3', SUPPLY_PLATFORM.id, 50), timed('s4', TRANSFORMATION.id, 60, 's3')],
  [queued('s5', SENTINEL.id, 's1'), queued('s6', SENTINEL.id), queued('s7', WORKER.id, 'base')],
);

describe('Editor reducer: build life', () => {
  it('should load a build and forget the last additions', () => {
    expect(editorReducer({ ...editing(ARMY), lastAddedUids: ['s1'] }, { type: 'load', build: ARMY })).toEqual(editing(ARMY));
  });

  it('should create an empty v3 build, and go back to the side choice on new', () => {
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

describe('Editor reducer: queue and pins', () => {
  it('should add a unit at the end of the queue, pinned or Auto', () => {
    const added = run(ARMY, { type: 'add-queued', entityId: SENTINEL.id, producerUid: 's2' }, { type: 'add-queued', entityId: SENTINEL.id });

    expect(added.build?.queued.slice(-2)).toEqual([queued('s8', SENTINEL.id, 's2'), queued('s9', SENTINEL.id)]);
  });

  it('should pin a unit and bring it back to Auto without an undefined field', () => {
    const auto = run(ARMY, { type: 'set-producer', uid: 's5' });

    expect(auto.build?.queued[0]).toEqual(queued('s5', SENTINEL.id));
    expect(run(ARMY, { type: 'set-producer', uid: 's6', producerUid: 's2' }).build?.queued[1]).toEqual(queued('s6', SENTINEL.id, 's2'));
  });

  it('should bring a transformation back to Auto and pin it again', () => {
    const auto = run(ARMY, { type: 'set-producer', uid: 's4' });

    expect(auto.build?.timed[3]).toStrictEqual(timed('s4', TRANSFORMATION.id, 60));
    expect(run(auto.build as Build, { type: 'set-producer', uid: 's4', producerUid: 's3' }).build?.timed[3]).toStrictEqual(ARMY.timed[3]);
  });

  it('should move units to a lane before a unit, else after the last unit of that lane', () => {
    const before = run(ARMY, { type: 'move-to-lane', uids: ['s6'], laneUid: 's1', beforeUid: 's5' });
    const after = run(ARMY, { type: 'move-to-lane', uids: ['s6'], laneUid: 'base', beforeUid: null });

    expect(before.build?.queued.map(({ uid, producerUid }) => [uid, producerUid])).toEqual([['s6', 's1'], ['s5', 's1'], ['s7', 'base']]);
    expect(after.build?.queued.map(({ uid }) => uid)).toEqual(['s5', 's7', 's6']);
  });

  it('should set and clear the time of any unit, the lane order following the times', () => {
    const set = run(ARMY, { type: 'set-queued-at', uids: ['s5'], at: 240.4 });

    expect(set.build?.queued.map(({ uid, at }) => [uid, at])).toEqual([['s6', undefined], ['s7', undefined], ['s5', 240]]);
    expect(editorReducer(set, { type: 'set-queued-at', uids: ['s5'], at: null }).build?.queued.at(-1)).toEqual(queued('s5', SENTINEL.id, 's1'));
  });

  it('should loop a unit until the end, then make it once again', () => {
    const looped = run(ARMY, { type: 'set-repeat', uids: ['s5'], repeat: true });

    expect(looped.build?.queued[0]).toEqual({ ...queued('s5', SENTINEL.id, 's1'), repeat: true });
    expect(editorReducer(looped, { type: 'set-repeat', uids: ['s5'], repeat: false }).build).toEqual(ARMY);
  });

  it('should shift each unit from its origin, held between 0 and the end', () => {
    const timedUnits = run(ARMY, { type: 'set-queued-at', uids: ['s6'], at: 100 });
    const shifted = run(
      timedUnits.build ?? ARMY,
      { type: 'shift-at', origins: { s6: 100, s7: 12.6 }, delta: 20.4 },
      { type: 'shift-at', origins: { s5: 70 }, delta: -500 },
    );

    expect(shifted.build?.queued.map(({ uid, at }) => [uid, at])).toEqual([['s5', 0], ['s7', 33], ['s6', 120]]);
    expect(run(ARMY, { type: 'shift-at', origins: { s6: 40 }, delta: 5000 }).build?.queued.at(-1)).toMatchObject({ uid: 's6', at: 1800 });
  });

  it('should keep the state when no step has an origin (a unit without a time that never starts)', () => {
    const state = editing(ARMY);

    expect(editorReducer(state, { type: 'shift-at', origins: {}, delta: 10 })).toBe(state);
  });

  it('should take an Altar hero out of the queue once picked as the setup hero', () => {
    const withHero = build([timed('s1', ALTAR.id, 30)], [queued('s2', KRAEGAR.id)]);

    expect(run(withHero, { type: 'set-hero', heroId: KRAEGAR.id }).build).toMatchObject({ heroId: KRAEGAR.id, queued: [] });
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
