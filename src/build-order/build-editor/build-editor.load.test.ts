import { describe, expect, it } from 'vitest';
import { encodeBuildLink } from '../link/link.codec.ts';
import { toLoadPlan } from './build-editor.load.ts';
import type { BuildLink } from '../build-order.types.ts';

const SIDES = { factionIds: ['protectorate'], mercenaryIds: ['arandi', 'marran'] };

const link = (title: string, stepCount: number): BuildLink => ({
  dataVersion: '1',
  factionId: 'protectorate',
  mercenaryId: null,
  heroRef: null,
  title,
  author: '',
  timed: Array.from({ length: stepCount }, (_, index) => ({ ref: 'b.barracks', at: index * 10, producerIndex: null })),
  queued: [],
});

const SHARED = encodeBuildLink(link('Shared', 2));

const kindOf = (hash: string) => toLoadPlan(hash, SIDES).kind;

describe('Editor loading order', () => {
  it('should open the side choice without a build in the hash', () => {
    expect(kindOf('')).toBe('picker');
  });

  it('should open a link', () => {
    expect(kindOf(`#b=${SHARED}`)).toBe('link');
  });

  it('should say an unreadable link cannot be read, an older v2 link included', () => {
    expect(kindOf('#b=2.oops')).toBe('invalid');
    expect(kindOf(`#b=2${SHARED.slice(1)}`)).toBe('invalid');
  });
});

describe('Editor loading: mercenary', () => {
  it('should open an old link without mercenary with the first one, as New build (Kieirra 2026-11-19)', () => {
    const plan = toLoadPlan(`#b=${SHARED}`, SIDES);

    expect(plan.kind === 'link' && plan.link.mercenaryId).toBe('arandi');
  });

  it('should keep the mercenary of a link', () => {
    const plan = toLoadPlan(`#b=${encodeBuildLink({ ...link('Marran', 1), mercenaryId: 'marran' })}`, SIDES);

    expect(plan.kind === 'link' && plan.link.mercenaryId).toBe('marran');
  });
});
