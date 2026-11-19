import type { BuildEntity } from '../build-order.types.ts';

type RuleStatus = 'confirmed' | 'provisional';

export interface Rule<T> {
  value: T;
  status: RuleStatus;
  note: string;
}

export type RequiresMode = 'any' | 'all';
export type StartRank = 'mercenary-unit' | 'harvester' | 'base' | 'supply' | 'unit' | 'other';
export type Reservation = 'strict' | 'none';

export interface GameRules {
  // Order in which the orders ready in the same tick start: first class first.
  startPriority: Rule<StartRank[]>;
  reservation: Rule<Reservation>;
  requiresMode: Record<BuildEntity['kind'], Rule<RequiresMode>>;
  // A build without mercenary takes the default one (getDefaultMercenaryId).
  mercenaryRequired: Rule<boolean>;
  // Copies of one mercenary building per match.
  mercenaryBuildingCopies: Rule<number>;
  heroes: {
    setupHeroAtSeconds: Rule<number>;
    mercenaryHeroInPool: Rule<boolean>;
    paidHeroSlots: Rule<number>;
  };
}

export type RuleOverrides = {
  [K in keyof GameRules]?: GameRules[K] extends Rule<unknown> ? GameRules[K] : Partial<GameRules[K]>;
};

export const BASE_RULES: GameRules = {
  startPriority: {
    value: ['base', 'mercenary-unit', 'supply', 'unit', 'other'],
    status: 'confirmed',
    note: 'Kieirra 2026-11-19: in-game order, bases first; The Legion differs. A patch may change it, and the queue system with it.',
  },
  reservation: { value: 'strict', status: 'provisional', note: 'Q4 / H4: the first ready order without resources blocks the next ones.' },
  requiresMode: {
    building: { value: 'any', status: 'provisional', note: 'Deduced from the data: one required building is enough.' },
    unit: { value: 'all', status: 'provisional', note: 'Every required building is needed.' },
    upgrade: { value: 'all', status: 'provisional', note: 'Every required building is needed.' },
    hero: { value: 'all', status: 'provisional', note: 'Every required building is needed.' },
  },
  mercenaryRequired: { value: true, status: 'confirmed', note: 'Kieirra 2026-11-19: no game without a mercenary.' },
  mercenaryBuildingCopies: {
    value: 1,
    status: 'confirmed',
    note: 'Mazar 2026-11-13: never twice the same mercenary building; a mercenary with two buildings may have both.',
  },
  heroes: {
    setupHeroAtSeconds: { value: 15, status: 'confirmed', note: 'Free setup hero chosen at 0:15.' },
    mercenaryHeroInPool: { value: true, status: 'confirmed', note: 'The mercenary hero joins the setup hero pool.' },
    paidHeroSlots: { value: 0, status: 'confirmed', note: 'No paid hero.' },
  },
};

export const FACTION_RULES: Partial<Record<string, RuleOverrides>> = {
  'the-legion': {
    startPriority: {
      value: ['harvester', 'base', 'mercenary-unit', 'supply', 'unit', 'other'],
      status: 'confirmed',
      note: 'Kieirra 2026-11-19: harvesters before the bases, the base being a special unit.',
    },
    heroes: {
      mercenaryHeroInPool: { value: false, status: 'confirmed', note: 'The Legion never gets the mercenary hero.' },
      paidHeroSlots: { value: 2, status: 'confirmed', note: 'Kieirra 2026-11-19: 3 heroes, the setup hero and 2 at the Altar.' },
    },
  },
};
