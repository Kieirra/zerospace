import { useEffect, useRef } from 'react';
import { EntityIcon } from '../../entity-icon/entity-icon.tsx';
import { useElementHeight } from '../../hooks/use-element-height.ts';
import { canRepeat, formatSupply, isMiscCategory, joinNames, toCostParts, toStepKind } from '../../build-order.helpers.ts';
import { toRequiresConjunction } from '../../engine/engine.analysis.ts';
import { toNames } from '../../engine/engine.placement.ts';
import { isReplicateStep } from '../../engine/engine.replicate.ts';
import { REPLICATE_TOPBAR_ID } from '../../game-data/game-data.constants.ts';
import { ERROR_COLOR } from '../../timeline/timeline.styles.ts';
import { WikiLink } from '../../wiki-link/wiki-link.tsx';
import { toAllSteps } from '../build-editor.helpers.ts';
import { ClickAtField } from './click-at-field/click-at-field.tsx';
import { useFocusReturn } from './hooks/use-focus-return.ts';
import { useStepAnchor } from './hooks/use-step-anchor.ts';
import { usePanelDismiss } from './hooks/use-panel-dismiss.ts';
import { MadeInSelect } from './made-in-select/made-in-select.tsx';
import { MergeInputs } from './merge-inputs/merge-inputs.tsx';
import { MergedInto } from './merged-into/merged-into.tsx';
import { MiscStepFacts } from './misc-step-facts/misc-step-facts.tsx';
import { toMadeInOptions } from './made-in-select/made-in-select.helpers.ts';
import { PanelButton } from './panel-button/panel-button.tsx';
import { RepeatField } from './repeat-field/repeat-field.tsx';
import { ReplicateTarget } from './replicate-target/replicate-target.tsx';
import { toReplicateTargetOptions } from './replicate-target/replicate-target.helpers.ts';
import { toPanelPosition, toStepErrors, toStepSubtitle, toWaitedUnitName } from './step-panel.helpers.ts';
import { StepTimes } from './step-times/step-times.tsx';
import type { Dispatch } from 'react';
import type { Build, BuildEntity } from '../../build-order.types.ts';
import type { SimulationContext, SimulationResult } from '../../engine/engine.types.ts';
import type { EditorAction } from '../build-editor.reducer.ts';

interface StepPanelProps {
  stepUid: string;
  build: Build;
  result: SimulationResult;
  context: SimulationContext;
  dispatch: Dispatch<EditorAction>;
  onRemove: () => void;
  // ✕ or a press outside: the panel closes, the step stays selected.
  onClose: () => void;
  // Escape: the selection is cleared.
  onEscape: () => void;
  // A merge or one of its inputs named in the panel (US-009): that step alone is selected, its panel open.
  onSelect: (stepUid: string) => void;
}

const PANEL_WIDTH_PX = 320;

const AS_SOON_AS_POSSIBLE = 'As soon as possible';

// The step selected on the timeline: its errors first, its click time and its building (Kieirra 2026-11-19), the loop
// of a unit, its Click, Start and Ready times, its wiki page and Remove. Next to its first mark. An event has no wiki
// page. A merge shows its inputs and its cost, a Replicate copy its target, energy and supply, a unit a merge took the
// merges it went into (US-009).
export const StepPanel = ({ stepUid, build, result, context, dispatch, onRemove, onClose, onEscape, onSelect }: StepPanelProps) => {
  const { ref, height } = useElementHeight<HTMLDivElement>();
  const anchor = useStepAnchor(stepUid);
  usePanelDismiss(ref, { onEscape, onPressOutside: onClose });
  useFocusReturn(ref, stepUid);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Once placed (a hidden panel cannot take the focus): keyboard users go on from the panel.
  const isPlaced = anchor !== null;
  useEffect(() => {
    if (isPlaced) titleRef.current?.focus();
  }, [stepUid, isPlaced]);
  const step = toAllSteps(build).find(({ uid }) => uid === stepUid);
  const entity = step && context.catalog.get(step.entityId);
  const timing = result.steps.find((candidate) => candidate.stepUid === stepUid);
  if (!step || !entity || !timing) return null;
  const isTimed = toStepKind(entity) === 'timed';
  const isMisc = isMiscCategory(entity);
  const isCopy = isReplicateStep(step);
  // A copy of a merge is no merge: it takes no input.
  const isMerge = !isCopy && entity.category === 'merge';
  const order = result.orders.find((candidate) => candidate.stepUid === stepUid && candidate.occurrence === 0);
  const requirement = joinNames(toNames(entity.requires, context.catalog), toRequiresConjunction(context.rules.requiresMode[entity.kind].value));
  const subtitle = toStepSubtitle(entity, isCopy, requirement);
  const waitNames = {
    requirement,
    unit: toWaitedUnitName(entity, isCopy, order, result, context.catalog),
    isRecruit: entity.category === 'mercenary-unit',
  };
  const position = anchor
    ? toPanelPosition(anchor, { width: PANEL_WIDTH_PX, height }, { width: window.innerWidth, height: window.innerHeight })
    : { left: 0, top: 0 };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={`step-panel-${stepUid}`}
      className="fixed z-[60] flex flex-col gap-2.5 border border-[#3b3a44] bg-surface-raised p-3 text-[12.5px] shadow-lg shadow-black/60"
      style={{ ...position, width: PANEL_WIDTH_PX, visibility: anchor ? undefined : 'hidden' }}
    >
      <div className="flex items-center gap-2">
        <EntityIcon entity={entity} />
        <h3 ref={titleRef} id={`step-panel-${stepUid}`} tabIndex={-1} className="flex-1 font-semibold outline-none">
          {entity.displayName}
        </h3>
        <button type="button" aria-label="Close" title="Close" onClick={onClose} className="size-6 cursor-pointer text-muted hover:text-text">
          ✕
        </button>
      </div>
      {subtitle !== null && <p className="-mt-1.5 text-muted">{subtitle}</p>}
      {toStepErrors(timing).map((message) => (
        <p key={message} style={{ color: ERROR_COLOR }}>
          ✖ {message}
        </p>
      ))}
      {isTimed && (
        <ClickAtField key={stepUid} seconds={step.at ?? 0} onCommit={(at) => at !== null && dispatch({ type: 'set-at', uid: stepUid, at })} />
      )}
      {((!isTimed && !isMerge && !isCopy) || entity.category === 'transformation') && (
        <MadeInSelect
          producerUid={step.producerUid}
          options={toMadeInOptions(entity, build, context.catalog, result.lanes)}
          onChange={(producerUid) => dispatch({ type: 'set-producer', uid: stepUid, producerUid })}
        />
      )}
      {!isTimed && (
        <ClickAtField
          key={stepUid}
          seconds={step.at ?? null}
          placeholder={AS_SOON_AS_POSSIBLE}
          onCommit={(at) => dispatch({ type: 'set-queued-at', uids: [stepUid], at })}
        />
      )}
      {isCopy && (
        <ReplicateTarget
          entityId={entity.id}
          options={toReplicateTargetOptions(context.catalog)}
          onChange={(entityId) => dispatch({ type: 'set-replicate-target', uid: stepUid, entityId })}
        />
      )}
      {!isTimed && !isCopy && canRepeat(entity, context.catalog) && (
        <RepeatField
          isRepeated={'repeat' in step && step.repeat === true}
          onChange={(repeat) => dispatch({ type: 'set-repeat', uids: [stepUid], repeat })}
        />
      )}
      {isMerge && order && <MergeInputs order={order} result={result} catalog={context.catalog} onSelect={onSelect} />}
      {order?.takenBy && (
        <MergedInto takenBy={order.takenBy} madeCount={isCopy || isMerge ? 1 : entity.count} result={result} catalog={context.catalog} onSelect={onSelect} />
      )}
      {isMisc ? (
        <MiscStepFacts effectLines={entity.effectLines ?? []} appliedAt={timing.startAt} />
      ) : (
        <StepTimes timing={timing} waits={order?.waits ?? {}} names={waitNames} stepAt={step.at} facts={toXolFacts(entity, isCopy)} />
      )}
      <div className="flex items-center justify-between border-t border-line pt-2.5">
        {entity.category !== 'event' && <WikiLink entityId={isCopy ? REPLICATE_TOPBAR_ID : entity.id} />}
        <div className="ml-auto">
          <PanelButton title="Remove" onClick={onRemove}>
            Remove
          </PanelButton>
        </div>
      </div>
    </div>
  );
};

// Facts of a merge, its cost (the supplement), and of a copy, its energy and the supply of one unit (US-009).
const toXolFacts = (entity: BuildEntity, isCopy: boolean) => {
  if (isCopy) {
    return [
      { label: 'Energy', value: String(entity.replicateEnergy ?? '') },
      { label: 'Supply', value: formatSupply(entity.supply / entity.count) },
    ];
  }
  if (entity.category !== 'merge') return [];
  return toCostParts(entity.cost).map((value, index) => ({ label: index === 0 ? 'Cost' : '', value }));
};
