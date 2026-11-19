import { describe, expect, it } from 'vitest';
import { SENTINEL, TRANSFORMATION, build } from '../engine/engine.fixtures.ts';
import { ALTAR, ARMY, KRAEGAR, editing, queued, run, timed } from './build-editor.reducer.fixtures.ts';
import { editorReducer } from './build-editor.reducer.ts';
import type { Build } from '../build-order.types.ts';

describe('Editor reducer: queue and pins', () => {
  it('should add a unit at the end of the queue, pinned or Auto', () => {
    const added = run(ARMY, { type: 'add-queued', entityId: SENTINEL.id, producerUid: 's2' }, { type: 'add-queued', entityId: SENTINEL.id });

    expect(added.build?.queued.slice(-2)).toEqual([queued('s8', SENTINEL.id, 's2'), queued('s9', SENTINEL.id)]);
  });

  it('should add a unit with a time among the units of the queue, by time', () => {
    const added = run(ARMY, { type: 'add-queued', entityId: SENTINEL.id, producerUid: 's2', at: 180.4 });

    expect(added.build?.queued.at(-1)).toEqual({ ...queued('s8', SENTINEL.id, 's2'), at: 180 });
    expect(added.lastAddedUids).toEqual(['s8']);
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

  it('should move units to a lane and shift them from their origins in the same action', () => {
    const shift = { origins: { s6: 70 }, delta: 110 };
    const moved = run(ARMY, { type: 'move-to-lane', uids: ['s6'], laneUid: 's1', beforeUid: null, shift });

    expect(moved.build?.queued.map(({ uid, producerUid, at }) => [uid, producerUid, at])).toEqual([
      ['s5', 's1', undefined],
      ['s7', 'base', undefined],
      ['s6', 's1', 180],
    ]);
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
