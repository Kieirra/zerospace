import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../../build-order.helpers.ts';
import { BARRACKS, ENTITIES, LAB, SENTINEL, WORKER } from '../../engine/engine.fixtures.ts';
import { lane, result, stepTiming } from '../../timeline/timeline.fixtures.ts';
import { INITIAL_EDITOR_STATE, editorReducer } from '../build-editor.reducer.ts';
import { REFUSED_DROP, toDragOrigin, toDropAction, toDropLabel, toLaneMoveAction, toLaneUid, toStepAt } from './use-editor-timeline-editing.helpers.ts';
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
    const dropped = action && action !== REFUSED_DROP ? editorReducer({ ...INITIAL_EDITOR_STATE, build: BUILD }, action).build : null;

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
    });
    expect(toLaneMoveAction(BUILD, RESULT, CATALOG, ['u2'], { t: 200, laneId: 'lane:b1' })).toMatchObject({ beforeUid: null });
  });

  it('should refuse a lane unable to make one of the units, and the setup hero lane', () => {
    expect(toDropAction(BUILD, RESULT, CATALOG, step('u2', 'lane:b2'), drop(0, 'lane:l1'), NONE)).toBe(REFUSED_DROP);
    expect(toLaneMoveAction(BUILD, RESULT, CATALOG, ['u2', 'w1'], { t: 90, laneId: 'lane:b1' })).toBe(REFUSED_DROP);
    expect(toLaneMoveAction(BUILD, RESULT, CATALOG, ['u2'], { t: 90, laneId: 'setup-hero' })).toBe(REFUSED_DROP);
  });

  it('should label the preview with the lane the unit goes to', () => {
    const action = { type: 'move-to-lane' as const, uids: ['u2'], laneUid: 'b1', beforeUid: null };
    const moved = result({ steps: [stepTiming('u2', { laneId: 'lane:b1', startAt: 96 })], lanes: RESULT.lanes });

    expect(toDropLabel(action, 'u2', BUILD, moved)).toBe('Barracks #1 · starts ≈ 1:36');
    expect(toDropLabel(action, 'u2', BUILD, result({ lanes: RESULT.lanes }))).toBe('Barracks #1 · never starts');
  });
});
