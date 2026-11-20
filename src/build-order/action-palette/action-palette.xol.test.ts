import { describe, expect, it } from 'vitest';
import { REPLICATE_UID } from '../build-order.types.ts';
import { toXolBuild, toXolContext } from '../engine/engine.wiki-fixtures.ts';
import { toPaletteTabs } from './action-palette.helpers.ts';
import type { Build } from '../build-order.types.ts';

// Xol cards (US-009): the MERGE section of Units, the Replicate card of Misc.
const ID = (path: string) => `the-xol/${path}`;

const tabsOf = (build: Build, selectedStepUid: string | null = null) => {
  const { catalog, rules, startingBuildingId } = toXolContext(build);
  return toPaletteTabs(build, { catalog, rules, startingBuildingId }, selectedStepUid);
};

const tilesOf = (build: Build, tabId: string, selectedStepUid: string | null = null) =>
  tabsOf(build, selectedStepUid).find(({ id }) => id === tabId)?.tiles ?? [];

describe('Palette: Xol merges and Replicate', () => {
  it('should list the 8 merges in the MERGE section, in the game menu order, with their recipe', () => {
    const merges = tilesOf(toXolBuild([]), 'units').filter(({ section }) => section === 'MERGE');

    expect(merges.map(({ entity }) => entity.name)).toEqual(['Echo', 'Gravitron', 'Defiant', 'Aegis', 'Synapse', 'Eradicator', 'Paradox', 'Cataclyst']);
    expect(merges[0].lines).toEqual(['2 Roller']);
    expect(merges[6].lines).toEqual(['Defiant + Synapse + Echo']);
  });

  it('should disable a merge without the producer of its tier 1 unit (CA Erreur)', () => {
    const echo = tilesOf(toXolBuild([[ID('building/power-core'), 0]]), 'units').find(({ entity }) => entity.id === ID('unit/echo'));

    expect(echo?.disabledReason).toBe('Build a Gyroforge first.');
  });

  it('should offer the Replicate card in the TOP BAR section once a Xol unit step is selected', () => {
    const build = toXolBuild([[ID('building/spectral-foundry'), 0]], [{ entityId: ID('unit/spectron') }, { entityId: ID('unit/synapse'), producerUid: REPLICATE_UID }]);
    const card = (uid: string | null) => tilesOf(build, 'misc', uid).find(({ section }) => section === 'TOP BAR');

    expect(card(null)).toMatchObject({ disabledReason: 'Select a Xol unit step to replicate.', lines: [] });
    expect(card('u1')).toMatchObject({ disabledReason: null, lines: ['7 Energy'] });
    expect(card('u2')).toMatchObject({ disabledReason: null, lines: ['19 Energy'] });
    expect(tilesOf(toXolBuild([]), 'misc').map(({ entity }) => entity.name)).toContain('Replicate');
  });
});
