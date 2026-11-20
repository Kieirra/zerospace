import { describe, expect, it } from 'vitest';
import { REPLICATE_UID } from '../build-order.types.ts';
import { simulateBuild } from '../engine/engine.ts';
import { getCatalog, toXolBuild, toXolContext } from '../engine/engine.wiki-fixtures.ts';
import { LINK_PREFIX } from '../link/link.constants.ts';
import { decodeBuildCode, encodeBuild, toBuildLink } from '../link/link.codec.ts';
import { resolveBuildLink } from '../link/link.resolve.ts';
import { toBoPlan } from './bo-plan.export.ts';
import { toBuild } from './bo-plan.import.ts';
import { printBoPlan } from './bo-plan.print.ts';
import type { Build } from '../build-order.types.ts';

// A Xol build with merges and Replicate copies in the link and in Copy as BO (US-009, CA10).
const CATALOGS = { faction: getCatalog('the-xol'), mercenary: null };
const ID = (path: string) => `the-xol/${path}`;
const SYNAPSE = ID('unit/synapse');

const BUILD = toXolBuild(
  [
    [ID('building/power-core'), 0],
    [ID('building/spectral-foundry'), 5],
    [ID('building/molten-core'), 55],
  ],
  [
    { entityId: ID('unit/spectron') },
    { entityId: ID('unit/spectron') },
    { entityId: SYNAPSE },
    { entityId: SYNAPSE, producerUid: REPLICATE_UID, at: 120 },
    { entityId: SYNAPSE, producerUid: REPLICATE_UID, at: 120 },
  ],
);

const print = (build: Build) => printBoPlan(toBoPlan(build, simulateBuild(build, toXolContext(build)), CATALOGS), CATALOGS);

describe('Xol merges and copies: link and Copy as BO (CA10)', () => {
  it('should encode a copy as [ref, -2] in a 3. link, and open the same build', () => {
    const code = encodeBuild(BUILD);
    const decoded = decodeBuildCode(code, { factionIds: ['the-xol'], mercenaryIds: [] });
    if (decoded.status !== 'ok') throw new Error('invalid link');

    expect(code.startsWith(LINK_PREFIX)).toBe(true);
    expect(toBuildLink(BUILD).queued.slice(-1)).toEqual([{ ref: 'u.synapse', producerIndex: -2, at: 120 }]);
    expect(resolveBuildLink(decoded.link, CATALOGS.faction, null).build.queued).toEqual(BUILD.queued.map((step, index) => ({ ...step, uid: `s${index + 4}` })));
  });

  it('should write a merge by its name and 2 copies at once as `2 Replicate (on Synapse)`, read back with every step', () => {
    const printed = print(BUILD);
    const reopened = toBuild(toBoPlan(BUILD, simulateBuild(BUILD, toXolContext(BUILD)), CATALOGS), CATALOGS);
    const stepsOf = (build: Build) => build.queued.map(({ entityId, producerUid }) => `${entityId} ${producerUid ?? ''}`).sort();

    expect(printed).toContain('Synapse');
    expect(printed).toContain('2 Replicate (on Synapse)');
    expect(stepsOf(reopened)).toEqual(stepsOf(BUILD));
  });
});
