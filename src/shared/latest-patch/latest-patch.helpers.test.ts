import { describe, expect, it } from 'vitest';
import { findLatestPatch, formatPatchWithDate } from './latest-patch.helpers.ts';

const patch = (id: string, label: string, date: string) => ({
  id,
  label,
  date,
  url: `https://store.steampowered.com/news/app/1605850/view/${id}`,
});

describe('Latest patch', () => {
  it('should return the patch note with the most recent date when the patch notes are unordered', () => {
    const patches = [
      patch('3', 'Update #17', '2026-10-27'),
      patch('5', 'Update #18', '2026-11-03'),
      patch('1', 'Patch', '2026-10-03'),
    ];

    expect(findLatestPatch(patches)).toEqual({
      label: 'Update #18',
      date: '2026-11-03',
      url: 'https://store.steampowered.com/news/app/1605850/view/5',
    });
  });

  it('should take the highest id when two patch notes share the most recent date', () => {
    const patches = [
      patch('1840944183778642', 'Patch', '2026-08-14'),
      patch('1840944183772520', 'Update #13', '2026-08-14'),
    ];

    expect(findLatestPatch(patches).label).toBe('Patch 2026-08-14');
  });

  it('should add its date to the label when the latest patch note is a hotfix labelled Patch', () => {
    const patches = [patch('5', 'Update #18', '2026-11-03'), patch('6', 'Patch', '2026-11-20')];

    expect(findLatestPatch(patches).label).toBe('Patch 2026-11-20');
  });

  it('should give the date in parentheses when the label does not already give it', () => {
    expect(formatPatchWithDate({ label: 'Update #18', date: '2026-11-03' })).toBe('Update #18 (2026-11-03)');
  });

  it('should not repeat the date when the label already gives it', () => {
    expect(formatPatchWithDate({ label: 'Patch 2026-11-20', date: '2026-11-20' })).toBe('Patch 2026-11-20');
  });

  it('should fail the build when there is no patch note', () => {
    expect(() => findLatestPatch([])).toThrow('data/patch-notes has no patch note.');
  });
});
