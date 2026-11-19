import { describe, expect, it } from 'vitest';
import { toCatalogMap } from '../build-order.helpers.ts';
import { BARRACKS, ENTITIES } from '../engine/engine.fixtures.ts';
import {
  createHistory,
  editorHistoryReducer,
  HISTORY_LIMIT,
  INITIAL_EDITOR_HISTORY,
  pushHistory,
  redo,
  undo,
} from './build-editor.history.ts';
import type { EditorHistory, HistoryAction } from './build-editor.history.ts';

const CATALOG = toCatalogMap(ENTITIES);
const ADD: HistoryAction = { type: 'add-timed', entityId: BARRACKS.id, at: 30 };

const run = (actions: HistoryAction[], history: EditorHistory = INITIAL_EDITOR_HISTORY) =>
  actions.reduce(editorHistoryReducer, history);

const CREATE: HistoryAction = { type: 'create', factionId: 'protectorate', mercenaryId: null, heroId: null };

describe('History stack', () => {
  it('should undo then redo', () => {
    const history = pushHistory(pushHistory(createHistory(1), 2), 3);

    expect(undo(history)).toEqual({ past: [1], present: 2, future: [3] });
    expect(redo(undo(history))).toEqual(history);
  });

  it('should keep the history when there is nothing to undo or redo', () => {
    const history = createHistory(1);

    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });

  it('should clear the future after a new entry', () => {
    const history = pushHistory(undo(pushHistory(createHistory(1), 2)), 5);

    expect(history).toEqual({ past: [1], present: 5, future: [] });
  });

  it(`should drop the oldest entries beyond ${HISTORY_LIMIT}`, () => {
    let history = createHistory(0);
    for (let value = 1; value <= HISTORY_LIMIT + 20; value += 1) history = pushHistory(history, value);

    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(20);
  });
});

describe('Editor history', () => {
  it('should undo and redo a step removal', () => {
    const added = run([CREATE, ADD, ADD]);
    const removed = run([{ type: 'remove-steps', uids: ['s1'], catalog: CATALOG }], added);

    expect(run([{ type: 'undo' }], removed).present.build?.timed).toEqual(added.present.build?.timed);
    expect(run([{ type: 'undo' }, { type: 'redo' }], removed).present.build).toEqual(removed.present.build);
  });

  it('should not select again the step added back then', () => {
    const undone = run([CREATE, ADD, ADD, { type: 'undo' }]);

    expect(undone.present.lastAddedUids).toEqual([]);
  });

  it('should record a drag of several steps as one entry', () => {
    const dragged = run([CREATE, ADD, ADD, { type: 'shift-at', origins: { s1: 30, s2: 30 }, delta: 40 }]);

    expect(dragged.present.build?.timed.map(({ at }) => at)).toEqual([70, 70]);
    expect(run([{ type: 'undo' }], dragged).present.build?.timed.map(({ at }) => at)).toEqual([30, 30]);
  });

  it('should not record a duplicate refused for being full', () => {
    const full = run([CREATE, ...Array.from({ length: 200 }, () => ADD)]);
    const refused = run([{ type: 'duplicate-steps', uids: ['s1'], catalog: CATALOG }], full);

    expect(refused.present.isFull).toBe(true);
    expect(refused.past).toHaveLength(full.past.length);
  });

  it('should not record an action that changes nothing', () => {
    const history = run([CREATE, { type: 'set-title', title: '' }]);

    expect(history.past).toHaveLength(0);
  });

  it('should record the author typed until the field is left as one entry', () => {
    const typed = run([CREATE, { type: 'set-author', author: 'M' }, { type: 'set-author', author: 'Ma' }, { type: 'end-edit' }]);
    const retyped = run([{ type: 'set-author', author: 'Maz' }], typed);

    expect(typed.past).toHaveLength(1);
    expect(run([{ type: 'undo' }], typed).present.build?.author).toBe('');
    expect(run([{ type: 'undo' }], retyped).present.build?.author).toBe('Ma');
  });

  it('should start the history with the first build created, and again once the side choice opens again', () => {
    const created = run([CREATE]);
    const recreated = run([ADD, { type: 'new' }, CREATE], created);

    expect(created.past).toEqual([]);
    expect(recreated.past).toEqual([]);
  });

  it(`should keep the last ${HISTORY_LIMIT} changes of the build after more than ${HISTORY_LIMIT}`, () => {
    const titles = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index): HistoryAction => ({ type: 'set-title', title: `v${index + 1}` }));
    const edited = run([CREATE, ADD, ...titles]);

    const undone = run(Array.from({ length: HISTORY_LIMIT + 10 }, (): HistoryAction => ({ type: 'undo' })), edited);

    expect(edited.past).toHaveLength(HISTORY_LIMIT);
    expect(undone.present.build?.title).toBe('v5');
    expect(undone.past).toEqual([]);
  });

  it('should start a new history on load', () => {
    const history = run([CREATE, ADD]);

    const loaded = run([{ type: 'load', build: history.present.build! }], history);

    expect(loaded.past).toEqual([]);
    expect(loaded.future).toEqual([]);
  });
});
