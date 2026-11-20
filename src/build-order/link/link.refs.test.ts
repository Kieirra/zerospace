import { describe, expect, it } from 'vitest';
import { STEAM_BUILD_ID } from '../../shared/site.constants.ts';
import { getCatalogWithMisc } from '../engine/engine.wiki-fixtures.ts';
import { decodeBuildCode, encodeBuild } from './link.codec.ts';
import { parseEntityRef, toEntityRef } from './link.refs.ts';
import { resolveBuildLink } from './link.resolve.ts';
import type { Build, KnownSides } from '../build-order.types.ts';

const EFFICIENT_UPGRADES = 'the-legion/talent/efficient-upgrades';
const LORE_OF_FLUX = 'arandi/talent/lore-of-flux';
const GUARDS = 'misc/event/tower-xp-creeps';

describe('Link refs: talents and events (US-008)', () => {
  it('should write a faction talent, a mercenary talent and an event when the build holds them', () => {
    expect(toEntityRef(EFFICIENT_UPGRADES, 'the-legion')).toBe('t.efficient-upgrades');
    expect(toEntityRef(LORE_OF_FLUX, 'the-legion')).toBe('mt.lore-of-flux');
    expect(toEntityRef(GUARDS, 'the-legion')).toBe('e.tower-xp-creeps');
  });

  it('should read them back, an event whatever the sides, never with the mercenary prefix', () => {
    expect(parseEntityRef('t.efficient-upgrades', 'the-legion', 'arandi')).toBe(EFFICIENT_UPGRADES);
    expect(parseEntityRef('mt.lore-of-flux', 'the-legion', 'arandi')).toBe(LORE_OF_FLUX);
    expect(parseEntityRef('e.tower-xp-creeps', 'the-legion', 'arandi')).toBe(GUARDS);
    expect(parseEntityRef('me.tower-xp-creeps', 'the-legion', 'arandi')).toBeNull();
  });

  it('should bring the Misc steps back at their times when a shared link is opened (CA7)', () => {
    const build: Build = {
      version: 3,
      dataVersion: STEAM_BUILD_ID,
      factionId: 'the-legion',
      mercenaryId: 'arandi',
      heroId: null,
      title: '',
      author: '',
      timed: [
        { uid: 's1', entityId: GUARDS, at: 40 },
        { uid: 's2', entityId: EFFICIENT_UPGRADES, at: 120 },
        { uid: 's3', entityId: LORE_OF_FLUX, at: 130 },
      ],
      queued: [],
    };
    const sides: KnownSides = { factionIds: ['the-legion'], mercenaryIds: ['arandi'] };

    const decoded = decodeBuildCode(encodeBuild(build), sides);
    const resolved = decoded.status === 'ok' ? resolveBuildLink(decoded.link, getCatalogWithMisc('the-legion'), getCatalogWithMisc('arandi')) : null;

    expect(resolved?.build.timed).toEqual(build.timed);
  });
});
