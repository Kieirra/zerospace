import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../../build-order.helpers.ts';
import { BARRACKS, ENTITIES, LAB, SENTINEL, WORKER } from '../../engine/engine.fixtures.ts';
import { lane, result, stepTiming } from '../../timeline/timeline.fixtures.ts';
import { INITIAL_EDITOR_STATE, editorReducer } from '../build-editor.reducer.ts';
import {
  REFUSED_DROP,
  toAddedMark,
  toDragOrigin,
  toDropAction,
  toDropLabel,
  toLaneMoveAction,
  toLaneUid,
  toStepAt,
} from './use-editor-timeline-editing.helpers.ts';
import type { Build } from '../../build-order.types.ts';

const CATALOG = toCatalogMap(ENTITIES);

// Two Barracks (b2 waits for resources) and a Lab that never starts; a Sentinel pinned on b1, two Auto Sentinels, a
// worker on the base.
const BUILD: Build = {
  version: 3,
  dataVersion: 'test',
  factionId: 'test',
  mercenaryId: null,
  heroId: null,
  title: '',
  author: '',
  timed: [
    { uid: 'b1', entityId: BARRACKS.id, at: 30 },
    { uid: 'b2', entityId: BARRACKS.id, at: 40 },
    { uid: 'l1', entityId: LAB.id, at: 50 },
  ],
  queued: [
    { uid: 'u1', entityId: SENTINEL.id, producerUid: 'b1' },
    { uid: 'u2', entityId: SENTINEL.id },
    { uid: 'u3', entityId: SENTINEL.id, at: 120 },
    { uid: 'w1', entityId: WORKER.id },
  ],
};

const RESULT = result({
  steps: [
    stepTiming('b1', { laneId: 'lane:base', startAt: 30 }),
    stepTiming('b2', { laneId: 'lane:base', startAt: 52 }),
    stepTiming('l1', { laneId: 'lane:base', startAt: null }),
    stepTiming('u1', { laneId: 'lane:b1', startAt: 60 }),
    stepTiming('u2', { laneId: 'lane:b2', startAt: 70 }),
    stepTiming('u3', { laneId: 'lane:b1', startAt: 120 }),
    stepTiming('w1', { laneId: 'lane:base', startAt: 0 }),
  ],
  lanes: [lane('lane:base', 'Base'), lane('lane:b1', 'Barracks #1'), lane('lane:b2', 'Barracks #2')],
});

const step = (uid: string, laneId: string) => ({ kind: 'step' as const, uid, laneId });
const drop = (delta: number, laneId: string | null, t = 100) => ({ t, delta, laneId });
const applyDrop = (action: ReturnType<typeof toDropAction>) =>
  action && action !== REFUSED_DROP ? editorReducer({ ...INITIAL_EDITOR_STATE, build: BUILD }, action) : null;
const NONE = new Set<string>();

describe('Timeline drop: target lane', () => {
  it('should read the building of a lane, and no building for the setup hero lane', () => {
    expect(toLaneUid('lane:b2')).toBe('b2');
    expect(toLaneUid('lane:base')).toBe('base');
    expect(toLaneUid('setup-hero')).toBeNull();
    expect(toLaneUid(null)).toBeNull();
  });
});

describe('Timeline drop: drag origin', () => {
  it('should move a step from the left edge of its mark: its simulated start, else its click when it never starts', () => {
    expect(toDragOrigin(BUILD, RESULT, 'b2')).toBe(52);
    expect(toDragOrigin(BUILD, RESULT, 'u2')).toBe(70);
    expect(toDragOrigin(BUILD, RESULT, 'l1')).toBe(50);
  });

  it('should give no origin to a unit without a time that never starts, nor to an unknown step', () => {
    const neverStarts = result({ steps: [stepTiming('u2', { startAt: null })] });

    expect(toDragOrigin(BUILD, neverStarts, 'u2')).toBeNull();
    expect(toDragOrigin(BUILD, RESULT, 'gone')).toBeNull();
  });

  it('should record the start of a building delayed by resources plus the seconds, where the line was', () => {
    const action = toDropAction(BUILD, RESULT, CATALOG, step('b2', 'lane:b2'), drop(6, 'lane:b2'), NONE);
    const dropped = applyDrop(action)?.build;

    expect(action).toEqual({ type: 'shift-at', origins: { b2: 52 }, delta: 6 });
    expect(dropped && toStepAt(dropped, 'b2')).toBe(58);
  });

  it('should keep the click of a step that never starts as its origin', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, step('l1', 'lane:base'), drop(10, 'lane:base'), NONE)).toEqual({
      type: 'shift-at',
      origins: { l1: 50 },
      delta: 10,
    });
  });
});

describe('Timeline drop: grouped drag', () => {
  it('should move the whole selection by the same seconds, each step from its own origin', () => {
    const selected = new Set(['b2', 'l1', 'u2', 'u3']);

    expect(toDropAction(BUILD, RESULT, CATALOG, step('b2', 'lane:base'), drop(40, 'lane:base'), selected)).toEqual({
      type: 'shift-at',
      origins: { b2: 52, l1: 50, u2: 70, u3: 120 },
      delta: 40,
    });
  });

  it('should move the grabbed step alone when it is not selected', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, step('b1', 'lane:base'), drop(-5, 'lane:base'), new Set(['b2']))).toEqual({
      type: 'shift-at',
      origins: { b1: 30 },
      delta: -5,
    });
  });

  it('should leave a selected unit without a time that never starts where it is', () => {
    const neverStarts = result({ steps: [stepTiming('b1', { startAt: 30 }), stepTiming('u2', { startAt: null })] });

    expect(toDropAction(BUILD, neverStarts, CATALOG, step('b1', 'lane:base'), drop(5, 'lane:base'), new Set(['b1', 'u2']))).toEqual({
      type: 'shift-at',
      origins: { b1: 30 },
      delta: 5,
    });
  });

  it('should only move a mixed selection in time, even released over another lane', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, step('u2', 'lane:b2'), drop(10, 'lane:b1'), new Set(['u2', 'b2']))).toEqual({
      type: 'shift-at',
      origins: { u2: 70, b2: 52 },
      delta: 10,
    });
  });

  it('should change nothing released in place', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, step('b1', 'lane:b1'), drop(0, 'lane:b1'), NONE)).toBeNull();
    expect(toDropAction(BUILD, RESULT, CATALOG, step('u2', 'lane:b2'), drop(0, null), NONE)).toBeNull();
  });
});

describe('Timeline drop: units to another lane', () => {
  it('should pin the selected units on a lane able to make them all, before its first unit starting after the drop', () => {
    const selected = new Set(['u2']);

    expect(toDropAction(BUILD, RESULT, CATALOG, step('u2', 'lane:b2'), drop(25, 'lane:b1', 90), selected)).toEqual({
      type: 'move-to-lane',
      uids: ['u2'],
      laneUid: 'b1',
      beforeUid: 'u3',
      shift: { origins: { u2: 70 }, delta: 25 },
    });
    expect(toLaneMoveAction(BUILD, RESULT, CATALOG, ['u2'], { t: 200, delta: 0, laneId: 'lane:b1' })).toMatchObject({ beforeUid: null });
  });

  it('should move the units in time too, each from its origin, so the grabbed one lands under the pointer', () => {
    const action = toDropAction(BUILD, RESULT, CATALOG, step('u2', 'lane:b2'), drop(110, 'lane:b1', 180), new Set(['u2', 'u3']));
    const dropped = applyDrop(action)?.build;

    expect(action).toMatchObject({ type: 'move-to-lane', laneUid: 'b1', shift: { origins: { u2: 70, u3: 120 }, delta: 110 } });
    expect(dropped && [toStepAt(dropped, 'u2'), toStepAt(dropped, 'u3')]).toEqual([180, 230]);
  });

  it('should keep the time of the units moved straight up or down', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, step('u2', 'lane:b2'), drop(0, 'lane:b1', 70), NONE)).toEqual({
      type: 'move-to-lane',
      uids: ['u2'],
      laneUid: 'b1',
      beforeUid: 'u3',
    });
  });

  it('should refuse a lane unable to make one of the units, and the setup hero lane', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, step('u2', 'lane:b2'), drop(0, 'lane:l1'), NONE)).toBe(REFUSED_DROP);
    expect(toLaneMoveAction(BUILD, RESULT, CATALOG, ['u2', 'w1'], { t: 90, delta: 0, laneId: 'lane:b1' })).toBe(REFUSED_DROP);
    expect(toLaneMoveAction(BUILD, RESULT, CATALOG, ['u2'], { t: 90, delta: 0, laneId: 'setup-hero' })).toBe(REFUSED_DROP);
  });

  it('should label the preview with the lane the unit goes to, and its time when it has one', () => {
    const action = { type: 'move-to-lane' as const, uids: ['u2'], laneUid: 'b1', beforeUid: null };
    const steps = [stepTiming('u2', { laneId: 'lane:b1', startAt: 96 }), stepTiming('u3', { laneId: 'lane:b1', startAt: 125 })];
    const moved = result({ steps, lanes: RESULT.lanes });

    expect(toDropLabel(action, 'u2', BUILD, moved)).toBe('Barracks #1 · starts ≈ 1:36');
    expect(toDropLabel(action, 'u2', BUILD, result({ lanes: RESULT.lanes }))).toBe('Barracks #1 · never starts');
    expect(toDropLabel({ ...action, uids: ['u3'] }, 'u3', BUILD, moved)).toBe('Barracks #1 · Click 2:00 · starts ≈ 2:05');
  });
});

describe('Timeline drop: palette cards', () => {
  it('should add a unit card on the lane under the pointer at the time under it, not as soon as possible', () => {
    const action = toDropAction(BUILD, RESULT, CATALOG, { kind: 'entity', entityId: SENTINEL.id }, drop(0, 'lane:b2', 180.4), NONE);
    const dropped = applyDrop(action);

    expect(action).toEqual({ type: 'add-queued', entityId: SENTINEL.id, producerUid: 'b2', at: 180 });
    expect(dropped?.build && toStepAt(dropped.build, dropped.lastAddedUids[0])).toBe(180);
  });

  it('should add a harvester card at the time under the pointer too', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, { kind: 'entity', entityId: WORKER.id }, drop(0, 'lane:base', 95), NONE)).toEqual({
      type: 'add-queued',
      entityId: WORKER.id,
      producerUid: 'base',
      at: 95,
    });
  });

  it('should give the ghost of the added unit its start and seconds, else its click time and its build time', () => {
    const ready = result({ steps: [stepTiming('u3', { startAt: 125, endAt: 155 })] });

    expect(toAddedMark(BUILD, ready, CATALOG, 'u3')).toEqual({ startAt: 125, seconds: 30, label: SENTINEL.displayName });
    expect(toAddedMark(BUILD, result(), CATALOG, 'u3')).toEqual({ startAt: 120, seconds: SENTINEL.duration, label: SENTINEL.displayName });
    expect(toAddedMark(BUILD, result(), CATALOG, 'u2')).toBeUndefined();
  });

  it('should refuse a unit card over a lane unable to make it', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, { kind: 'entity', entityId: SENTINEL.id }, drop(0, 'lane:l1', 180), NONE)).toBeNull();
  });
});
