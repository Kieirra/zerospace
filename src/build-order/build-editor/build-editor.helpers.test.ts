import { describe, expect, it } from 'vitest';
import { toSide } from '../catalog/catalog.helpers.ts';
import { sideFiles, toBuild } from '../engine/engine.wiki-fixtures.ts';
import { countSideSteps, createStepUids, toDefaultHeroId, toKeptHeroId, toSideChangeText } from './build-editor.helpers.ts';

const sides = sideFiles.map((file) => toSide(file, sideFiles));

describe('Editor: hero after a side change', () => {
  it('should give the faction hero by default', () => {
    expect(toDefaultHeroId(sides, 'protectorate', 'marran')).toBe('protectorate/hero/prefect-aster');
    expect(toDefaultHeroId(sides, 'the-legion', null)).toBe('the-legion/hero/galavax');
  });

  it('should keep a common hero and drop the hero of the old mercenary', () => {
    expect(toKeptHeroId(sides, 'protectorate', 'arandi', 'protectorate/hero/marv')).toBe('protectorate/hero/marv');
    expect(toKeptHeroId(sides, 'protectorate', 'arandi', 'marran/hero/hel')).toBe('protectorate/hero/prefect-aster');
    expect(toKeptHeroId(sides, 'protectorate', null, 'marran/hero/hel')).toBe('protectorate/hero/prefect-aster');
  });
});

describe('Editor: side change confirmation', () => {
  it('should count the steps of a side', () => {
    const build = toBuild(
      'protectorate',
      'marran',
      [
        ['marran/building/marran-bulwark', 10],
        ['protectorate/building/barracks', 20],
      ],
      ['protectorate/unit/prospector'],
    );

    expect(countSideSteps(build, 'protectorate')).toBe(2);
    expect(countSideSteps(build, 'marran')).toBe(1);
    expect(countSideSteps(build, null)).toBe(0);
  });

  it('should word the confirmation', () => {
    expect(toSideChangeText('faction', 3, 'Protectorate')).toBe('Change faction? 3 steps from Protectorate will be removed.');
    expect(toSideChangeText('mercenary', 1, 'Marran')).toBe('Change mercenary? 1 step from Marran will be removed.');
  });
});

describe('Editor: step uids', () => {
  it('should give the next numbers after the highest uid of both lists', () => {
    const build = { timed: [{ uid: 's7', entityId: 'x', at: 0 }], queued: [{ uid: 'x', entityId: 'y' }, { uid: 's3', entityId: 'y' }] };

    expect(createStepUids(build, 2)).toEqual(['s8', 's9']);
    expect(createStepUids({ timed: [], queued: [] }, 1)).toEqual(['s1']);
  });
});
