// Test fixtures only: the build and the helpers shared by the editor reducer tests.
import { toCatalogMap } from '../build-order.helpers.ts';
import { BARRACKS, ENTITIES, SENTINEL, SUPPLY_PLATFORM, TRANSFORMATION, WORKER, build, entity } from '../engine/engine.fixtures.ts';
import { INITIAL_EDITOR_STATE, editorReducer } from './build-editor.reducer.ts';
import type { Build, QueuedStep, TimedStep } from '../build-order.types.ts';
import type { EditorAction, EditorState } from './build-editor.reducer.ts';

export const ALTAR = entity('building/altar', { kind: 'building', category: 'building' });
export const KRAEGAR = entity('hero/kraegar', { kind: 'hero', category: 'hero', producedBy: [ALTAR.id] });
export const CATALOG = toCatalogMap([...ENTITIES, ALTAR, KRAEGAR]);

export const timed = (uid: string, entityId: string, at: number, producerUid?: string): TimedStep => ({
  uid,
  entityId,
  at,
  ...(producerUid === undefined ? {} : { producerUid }),
});
export const queued = (uid: string, entityId: string, producerUid?: string): QueuedStep => ({
  uid,
  entityId,
  ...(producerUid === undefined ? {} : { producerUid }),
});

export const editing = (value: Build): EditorState => ({ ...INITIAL_EDITOR_STATE, build: value });
export const run = (value: Build, ...actions: EditorAction[]) => actions.reduce(editorReducer, editing(value));

// Two Barracks with a Sentinel each, workers on the base, a supply platform turned into a turret.
export const ARMY = build(
  [timed('s1', BARRACKS.id, 30), timed('s2', BARRACKS.id, 40), timed('s3', SUPPLY_PLATFORM.id, 50), timed('s4', TRANSFORMATION.id, 60, 's3')],
  [queued('s5', SENTINEL.id, 's1'), queued('s6', SENTINEL.id), queued('s7', WORKER.id, 'base')],
);
