import { ActionPalette } from '../../action-palette/action-palette.tsx';
import { canProduceOn, toStepKind } from '../../build-order.helpers.ts';
import { toLatestAt } from '../build-editor.timed.ts';
import type { Dispatch, ReactNode } from 'react';
import type { Build, BuildEntity } from '../../build-order.types.ts';
import type { SimulationContext } from '../../engine/engine.types.ts';
import type { EditorAction } from '../build-editor.reducer.ts';

interface EditorPaletteProps {
  build: Build;
  // Chip selected on the timeline: a unit added goes on its lane when that building can make it.
  selectedStepUid: string | null;
  context: SimulationContext;
  // Top right of the panel header (the fold button).
  headerAction?: ReactNode;
  dispatch: Dispatch<EditorAction>;
}

// 'Add step' of the editor. A building or research starts as soon as possible after the latest click of the build;
// a unit goes to the selected building when it can make it, else Auto (Kieirra 2026-11-19).
export const EditorPalette = ({ build, selectedStepUid, context, headerAction, dispatch }: EditorPaletteProps) => {
  const { catalog } = context;
  const add = (entity: BuildEntity) => {
    if (toStepKind(entity) === 'timed') {
      dispatch({ type: 'add-timed', entityId: entity.id, at: toLatestAt(build) });
      return;
    }
    const isCapable = selectedStepUid !== null && canProduceOn(entity, selectedStepUid, build, catalog);
    dispatch({ type: 'add-queued', entityId: entity.id, ...(isCapable && selectedStepUid !== null ? { producerUid: selectedStepUid } : {}) });
  };
  return (
    <ActionPalette
      key={build.factionId}
      build={build}
      context={context}
      headerAction={headerAction}
      onAdd={add}
    />
  );
};
