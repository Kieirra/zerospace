import { describe, expect, it } from 'vitest';
import type { PatchNote } from '../../wiki-data.types.ts';
import { shouldShowSubject, sortEntriesForEntity, toEntityUpdates } from './entity-updates.helpers.ts';

const patch18: PatchNote = {
  id: '1847920302250372',
  label: 'Update #18',
  title: 'Update #18: Vynthra Rework, Spectator Tools, Balance and More',
  date: '2026-11-03',
  url: 'https://store.steampowered.com/news/app/1605850/view/1847920302250372',
  sections: [
    {
      faction: 'grell',
      heading: 'Grell',
      entries: [{ subject: 'Lasher', entityIds: ['grell/unit/lasher'], lines: [{ text: 'Move speed 575 to 600' }] }],
    },
    {
      faction: 'the-xol',
      heading: 'Xol',
      entries: [
        {
          subject: 'Overclock',
          entityIds: ['the-xol/unit/synapse', 'the-xol/unit/xol-harvester'],
          lines: [{ text: 'Bonus damage 35% to 25%' }],
        },
        { subject: 'Synapse', entityIds: ['the-xol/unit/synapse'], lines: [{ text: 'Heal duration 6s to 10s' }] },
      ],
    },
  ],
};

const patchJuly: PatchNote = {
  ...patch18,
  id: '1839676055886343',
  label: 'Patch',
  date: '2026-07-30',
  sections: [
    {
      faction: 'grell',
      heading: 'Grell',
      entries: [{ subject: 'Lasher', entityIds: ['grell/unit/lasher'], lines: [{ text: 'Health 110 to 120' }] }],
    },
  ],
};

const toLabels = (updates: ReturnType<typeof toEntityUpdates>) =>
  updates.map(({ patch, entries }) => ({ label: patch.label, lines: entries.flatMap(({ lines }) => lines.map(({ text }) => text)) }));

describe('Entity updates', () => {
  it('should list the patches of an entity from the most recent when several patches change it', () => {
    expect(toLabels(toEntityUpdates('grell/unit/lasher', [patchJuly, patch18]))).toEqual([
      { label: 'Update #18', lines: ['Move speed 575 to 600'] },
      { label: 'Patch', lines: ['Health 110 to 120'] },
    ]);
  });

  it('should keep an entry on every entity it targets when it names several entities', () => {
    const synapse = toEntityUpdates('the-xol/unit/synapse', [patch18]);
    const harvester = toEntityUpdates('the-xol/unit/xol-harvester', [patch18]);

    expect(synapse.map(({ entries }) => entries.map(({ subject }) => subject))).toEqual([['Overclock', 'Synapse']]);
    expect(harvester.map(({ entries }) => entries.map(({ subject }) => subject))).toEqual([['Overclock']]);
  });

  it('should return no update when no entry targets the entity', () => {
    expect(toEntityUpdates('grell/unit/weaver', [patch18])).toEqual([]);
  });
});

describe('Entry subject', () => {
  it('should be shown when it names something else than the entity', () => {
    expect(shouldShowSubject('Overclock', 'Synapse')).toBe(true);
  });

  it('should be hidden when it is the entity name written differently', () => {
    expect(shouldShowSubject('Krag’vorn', "Krag'Vorn")).toBe(false);
    expect(shouldShowSubject(null, 'Lasher')).toBe(false);
  });

  it('should be hidden when it ends the entity name', () => {
    expect(shouldShowSubject('Harvester', 'Xol Harvester')).toBe(false);
  });
});

describe('Entry order', () => {
  it('should put the entries about the entity before the ones under a subject when a patch has both', () => {
    const [{ entries }] = toEntityUpdates('the-xol/unit/synapse', [patch18]);

    expect(sortEntriesForEntity(entries, 'Synapse').map(({ subject }) => subject)).toEqual(['Synapse', 'Overclock']);
  });
});
