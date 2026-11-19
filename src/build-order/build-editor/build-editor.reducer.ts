import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { createStepUids, isEmptyBuild, isFullBuild, isOnSide, removeSteps, toAllSteps, withOptional } from './build-editor.helpers.ts';
import { toDuplicatedSteps, toPastedSteps } from './build-editor.clipboard.ts';
import { addQueued, dropOrphanUnits, dropPickedHero, moveToLane, setQueuedAt, setQueuedProducer, shiftQueuedAt } from './build-editor.queued.ts';
import { addTimed, setTimedAt, setTimedProducer, shiftTimedAt } from './build-editor.timed.ts';
import type { Build, BuildCatalog, QueuedStep, TimedStep } from '../build-order.types.ts';
import type { ClipboardResult, ClipboardSteps, PasteTarget } from './build-editor.clipboard.ts';

export interface EditorState {
  // null: the sides are being chosen.
  build: Build | null;
  // Steps added by the last action (add, paste, duplicate): the editor selects them.
  lastAddedUids: string[];
  // Last add, paste or duplicate refused: the build would pass MAX_STEPS.
  isFull: boolean;
  // Copies skipped by the last paste or duplicate (already in the build).
  skippedCount: number;
}

// `catalog`: faction + mercenary entities of the build, for the invariant "no unit without a building".
export type EditorAction =
  | { type: 'load'; build: Build }
  | { type: 'new' }
  | { type: 'create'; factionId: string; mercenaryId: string | null; heroId: string | null }
  | { type: 'reset' }
  | { type: 'set-faction'; factionId: string; heroId: string | null; catalog: BuildCatalog }
  | { type: 'set-mercenary'; mercenaryId: string | null; heroId: string | null; catalog: BuildCatalog }
  | { type: 'set-hero'; heroId: string }
  | { type: 'set-title'; title: string }
  | { type: 'set-author'; author: string }
  | { type: 'add-timed'; entityId: string; at: number; producerUid?: string }
  | { type: 'add-queued'; entityId: string; producerUid?: string }
  | { type: 'set-at'; uid: string; at: number }
  // `origins`: time each moved step leaves from, by uid, the left edge of its mark (the reducer never simulates).
  | { type: 'shift-at'; origins: Record<string, number>; delta: number }
  | { type: 'set-producer'; uid: string; producerUid?: string }
  | { type: 'move-to-lane'; uids: string[]; laneUid: string; beforeUid: string | null }
  | { type: 'set-queued-at'; uids: string[]; at: number | null }
  | { type: 'remove-steps'; uids: string[]; catalog: BuildCatalog }
  | { type: 'paste-steps'; steps: ClipboardSteps; target: PasteTarget; catalog: BuildCatalog }
  | { type: 'duplicate-steps'; uids: string[]; catalog: BuildCatalog };

export const INITIAL_EDITOR_STATE: EditorState = { build: null, lastAddedUids: [], isFull: false, skippedCount: 0 };

// Never computes a time: the build keeps click times, the production order and the pins only.
export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  if (action.type === 'load') return { ...INITIAL_EDITOR_STATE, build: action.build };
  if (action.type === 'new') return INITIAL_EDITOR_STATE;
  if (action.type === 'create') return { ...INITIAL_EDITOR_STATE, build: createBuild(action) };
  const { build } = state;
  if (build === null) return state;
  switch (action.type) {
    case 'reset':
      return isEmptyBuild(build) ? state : toState(state, { ...build, timed: [], queued: [] });
    case 'set-faction':
      return toState(state, withoutOrphans(withoutSide({ ...build, factionId: action.factionId, heroId: action.heroId }, build.factionId), action.catalog));
    case 'set-mercenary':
      return toState(state, withoutOrphans(withoutSide({ ...build, mercenaryId: action.mercenaryId, heroId: action.heroId }, build.mercenaryId), action.catalog));
    case 'set-hero':
      return toState(state, dropPickedHero(withBuild(build, { heroId: action.heroId }), action.heroId));
    case 'set-title':
      return toState(state, withBuild(build, { title: action.title }));
    case 'set-author':
      return toState(state, withBuild(build, { author: action.author }));
    case 'add-timed': {
      if (isFullBuild(build)) return { ...state, isFull: true };
      const [uid] = createStepUids(build, 1);
      const step: TimedStep = { uid, entityId: action.entityId, at: action.at };
      return toState(state, addTimed(build, withOptional(step, 'producerUid', action.producerUid)), [uid]);
    }
    case 'add-queued': {
      if (isFullBuild(build)) return { ...state, isFull: true };
      const [uid] = createStepUids(build, 1);
      const step: QueuedStep = { uid, entityId: action.entityId };
      return toState(state, addQueued(build, withOptional(step, 'producerUid', action.producerUid)), [uid]);
    }
    case 'set-at':
      return toState(state, setTimedAt(build, action.uid, action.at));
    case 'shift-at':
      return toState(state, shiftQueuedAt(shiftTimedAt(build, action.origins, action.delta), action.origins, action.delta));
    case 'set-producer': {
      const isTimed = build.timed.some(({ uid }) => uid === action.uid);
      return toState(state, (isTimed ? setTimedProducer : setQueuedProducer)(build, action.uid, action.producerUid));
    }
    case 'move-to-lane':
      return toState(state, moveToLane(build, action.uids, action.laneUid, action.beforeUid));
    case 'set-queued-at':
      return toState(state, setQueuedAt(build, action.uids, action.at));
    case 'remove-steps':
      return toState(state, withoutOrphans(removeSteps(build, action.uids), action.catalog));
    case 'paste-steps':
      return toCopiedState(state, toPastedSteps(build, action.steps, action.target, action.catalog), action.catalog);
    case 'duplicate-steps':
      return toCopiedState(state, toDuplicatedSteps(build, action.uids, action.catalog), action.catalog);
  }
};

const createBuild = ({ factionId, mercenaryId, heroId }: Extract<EditorAction, { type: 'create' }>): Build => ({
  version: 3,
  dataVersion: STEAM_BUILD_ID,
  factionId,
  mercenaryId,
  heroId,
  title: '',
  author: '',
  timed: [],
  queued: [],
});

// The same build keeps the state, so the history gets no empty entry; the added uids of the last action are forgotten.
const toState = (state: EditorState, build: Build, lastAddedUids: string[] = []): EditorState =>
  build === state.build ? state : { ...INITIAL_EDITOR_STATE, build, lastAddedUids };

const toCopiedState = (state: EditorState, result: ClipboardResult, catalog: BuildCatalog): EditorState => {
  if (result.status === 'full') return { ...state, isFull: true, skippedCount: 0 };
  const build = withoutOrphans(result.build, catalog);
  const steps = new Set(toAllSteps(build).map(({ uid }) => uid));
  const next = toState(state, build, result.addedUids.filter((uid) => steps.has(uid)));
  return { ...next, skippedCount: result.skippedCount };
};

const withoutOrphans = (build: Build, catalog: BuildCatalog) => dropOrphanUnits(build, catalog).build;

// The steps of the side left behind leave with it.
const withoutSide = (build: Build, sideId: string | null): Build => {
  if (sideId === null) return build;
  const isKept = ({ entityId }: { entityId: string }) => !isOnSide(entityId, sideId);
  return { ...build, timed: build.timed.filter(isKept), queued: build.queued.filter(isKept) };
};

const withBuild = (build: Build, changes: Partial<Pick<Build, 'heroId' | 'title' | 'author'>>): Build =>
  Object.entries(changes).every(([key, value]) => build[key as keyof typeof changes] === value) ? build : { ...build, ...changes };
