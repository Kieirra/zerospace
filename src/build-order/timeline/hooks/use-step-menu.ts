import { useState } from 'react';
import { findStepMark } from './use-bar-drag.helpers.ts';
import type { MouseEvent } from 'react';
import type { TimelineEditing } from '../timeline-editing.ts';

export interface StepMenuRequest {
  // Viewport point of the right click.
  pointer: { x: number; y: number };
  // The selection when the mark is part of it, else the step of the mark alone.
  uids: string[];
  // The right-clicked mark: the keyboard focus goes back to it.
  mark: HTMLElement;
}

// Editor (Kieirra 2026-11-19): a right click on the mark of a step opens its menu at the pointer instead of the
// browser's, the step becoming the selection when it is not part of it (no panel); elsewhere the browser's menu stays.
export const useStepMenu = (editing: TimelineEditing) => {
  const [request, setRequest] = useState<StepMenuRequest | null>(null);

  const onContextMenu = (event: MouseEvent<HTMLElement>) => {
    const mark = event.target instanceof Element ? findStepMark(event.target) : null;
    const uid = mark?.dataset.stepUid;
    if (!mark || !uid) return;
    event.preventDefault();
    const isSelected = editing.selectedUids.has(uid);
    if (!isSelected) editing.onSelectRect([uid], false);
    setRequest({ pointer: { x: event.clientX, y: event.clientY }, uids: isSelected ? [...editing.selectedUids] : [uid], mark });
  };

  return { request, onContextMenu, close: () => setRequest(null) };
};
