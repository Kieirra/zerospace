import { describe, expect, it } from 'vitest';
import { EMPTY_SELECTION, toKeptSelection, toManySelection, toSingleSelection, toToggledSelection } from './use-timeline-selection.helpers.ts';

const selection = (uids: string[], panelUid: string | null = null) => ({ uids: new Set(uids), panelUid });

describe('Timeline selection', () => {
  it('should select one step and open its panel on a plain click', () => {
    expect(toSingleSelection('s1')).toEqual(selection(['s1'], 's1'));
  });

  it('should add or take out a step on a modifier click, and close the panel', () => {
    expect(toToggledSelection(selection(['s1'], 's1'), 's2')).toEqual(selection(['s1', 's2']));
    expect(toToggledSelection(selection(['s1', 's2']), 's1')).toEqual(selection(['s2']));
  });

  it('should replace the selection, or add to it, with many steps', () => {
    expect(toManySelection(selection(['s1'], 's1'), ['s2', 's3'], false)).toEqual(selection(['s2', 's3']));
    expect(toManySelection(selection(['s1']), ['s1', 's3'], true)).toEqual(selection(['s1', 's3']));
  });

  it('should forget the steps gone from the build, and keep the same state when none left', () => {
    const state = selection(['s1', 's2'], null);

    expect(toKeptSelection(state, new Set(['s1', 's2', 's3']))).toBe(state);
    expect(toKeptSelection(state, new Set(['s2']))).toEqual(selection(['s2']));
    expect(toKeptSelection(selection(['s1'], 's1'), new Set())).toEqual(EMPTY_SELECTION);
  });
});
