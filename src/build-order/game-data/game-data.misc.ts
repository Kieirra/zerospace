import type { EffectTarget, SpawnTrigger } from '../build-order.types.ts';

// Misc steps (US-008): talents that change the economy and events placed by the player, never simulated from the XP.

// Side of the events shared by every faction, and the first segment of every event id.
export const MISC_SIDE_ID = 'misc';

// A number of the talent's wiki `values`.
interface ValueRef {
  key: string;
}

export type Amount = number | ValueRef;

// How a percent of the wiki becomes a multiplier: 1 / (1 + p / 100) | 1 - p / 100.
export type MultiplierOf = { speedPercent: Amount } | { reductionPercent: Amount };

export type MiscEffectSource =
  | { kind: 'flux-income'; percent: Amount }
  | { kind: 'cost'; target: EffectTarget; multiplier: MultiplierOf }
  | { kind: 'duration'; target: EffectTarget; multiplier: MultiplierOf }
  | { kind: 'grant'; hexite: number; flux: number }
  // As many Harvesters as one Flux node of the faction holds (Harvesters per node), known with the faction.
  | { kind: 'spawn-harvesters' }
  | { kind: 'spawn-units'; entityId: string; count: Amount; waitsForSupply: boolean }
  | { kind: 'spawn-on-finish'; entityId: string; trigger: SpawnTrigger }
  | { kind: 'building-copies'; entityId: string; copies: Amount }
  | { kind: 'production-charges'; entityIds: string[]; maxDelta: Amount; recharge: MultiplierOf };

export interface MiscSource {
  effects: MiscEffectSource[];
  // Templates interpolated with the wiki values ('+{N} Harvesters'); `{supply}` is the supply of the units it makes.
  lines: string[];
  status: 'confirmed' | 'provisional';
  owner: 'Kieirra' | 'Mazar';
  note: string;
}

export interface MiscEventSource extends MiscSource {
  name: string;
  // null: every faction.
  sideId: string | null;
}

const RESEARCH: EffectTarget = { categories: ['research'] };
const OUTPOST = 'free-corsairs/building/free-corsair-mercenary-outpost';
const REINFORCEMENTS_NOTE = 'Cast refused without free supply for the whole group.';
const XOL_PRODUCERS = ['the-xol/building/gyroforge', 'the-xol/building/spectral-foundry', 'the-xol/building/xyther-assembler'];

// Key: wiki talent id. Talents are instant and cost one talent point, no resource (game files, build 26680201).
export const MISC_TALENTS: Record<string, MiscSource> = {
  'arandi/talent/lore-of-flux': {
    effects: [{ kind: 'spawn-harvesters' }, { kind: 'flux-income', percent: { key: 'income' } }],
    // {harvestersPerNode}: filled once the faction is known (`withFactionValues`).
    lines: ['+{harvestersPerNode} Harvesters', '+{income}% Flux income'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Kieirra 2026-11-20: Harvesters per node of the faction (Xol 1, Legion 3, others 2), not the wiki N. Game: min(remaining cap, that), no supply.',
  },
  'the-legion/talent/efficient-upgrades': {
    effects: [
      { kind: 'cost', target: RESEARCH, multiplier: { reductionPercent: { key: 'Cost' } } },
      { kind: 'duration', target: RESEARCH, multiplier: { speedPercent: { key: 'Speed' } } },
    ],
    lines: ['+{Speed}% research speed', '-{Cost}% research cost'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Kieirra 2026-11-20: Battle Frenzy 100 Flux costs 60 after the talent. Transformations not covered (provisional).',
  },
  'the-legion/talent/improved-conduits': {
    effects: [
      {
        kind: 'duration',
        target: { entityIds: ['the-legion/building/idal-conduit'] },
        multiplier: { reductionPercent: { key: 'Reduction' } },
      },
    ],
    lines: ['-{Reduction}% Idal Conduit build time'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Building.Supply buildings x 0.5.',
  },
  'the-legion/talent/unending-army': {
    effects: [{ kind: 'spawn-on-finish', entityId: 'the-legion/unit/thrall', trigger: { kind: 'faction-unit' } }],
    lines: ['+1 Thrall per unit made'],
    status: 'provisional',
    owner: 'Kieirra',
    note: 'Kieirra 2026-11-20: combat units only, no supply check.',
  },
  'grell/talent/rapid-germination': {
    effects: [
      {
        kind: 'duration',
        target: { categories: ['building', 'mercenary-building'] },
        multiplier: { speedPercent: { key: 'Increase' } },
      },
    ],
    lines: ['+{Increase}% construction speed'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Construction time / 1.35, read when construction starts.',
  },
  'free-corsairs/talent/entrenched-hideouts': {
    effects: [
      { kind: 'duration', target: { entityIds: [OUTPOST] }, multiplier: { reductionPercent: { key: 'Build Time' } } },
      { kind: 'building-copies', entityId: OUTPOST, copies: { key: 'Limit' } },
    ],
    lines: ['-{Build Time}% Outpost build time', 'Up to {Limit} Outposts'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Raider spawn every 30 s not simulated.',
  },
  'valkaru/talent/hounds-of-war': {
    effects: [
      {
        kind: 'spawn-on-finish',
        entityId: 'valkaru/unit/valkaru-hound',
        trigger: { kind: 'recruit-at', producerId: 'valkaru/building/valkaru-war-vault' },
      },
    ],
    lines: ['+1 Hound per hire'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'No supply check.',
  },
  'endari/talent/they-writhe': {
    effects: [{ kind: 'spawn-units', entityId: 'endari/unit/endari-shadow-leech', count: { key: 'count' }, waitsForSupply: false }],
    lines: ['+{count} Shadow Leeches'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'No supply check.',
  },
  'the-xol/talent/instant-power-core': {
    effects: [{ kind: 'duration', target: { entityIds: ['the-xol/building/power-core'] }, multiplier: { reductionPercent: 99.5 } }],
    lines: ['Power Cores build instantly'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Kieirra 2026-11-20: Power Core time x 0.005 (RI_Talent_Xol_MP_InstantPowerCore).',
  },
  'the-xol/talent/overclocked-production': {
    effects: [
      {
        kind: 'production-charges',
        entityIds: XOL_PRODUCERS,
        maxDelta: { key: 'charges' },
        recharge: { speedPercent: { key: 'rate' } },
      },
    ],
    lines: ['+{charges} max production charges', '+{rate}% charge recharge speed'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Kieirra 2026-11-20: producers completed after the talent only.',
  },
  'the-xol/talent/improved-systems': {
    effects: [{ kind: 'duration', target: { categories: ['merge'] }, multiplier: { reductionPercent: { key: 'merge_time' } } }],
    lines: ['-{merge_time}% merging time'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Kieirra 2026-11-20: Overclock duration ignored (combat).',
  },
  'the-xol/talent/efficient-replication': {
    effects: [{ kind: 'duration', target: { categories: ['replicate'] }, multiplier: { reductionPercent: { key: 'timereduc' } } }],
    lines: ['-{timereduc}% Replicate time'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: 'Kieirra 2026-11-20: 16 s to 6 s (RI_Talent_Xol_MP_ReplicateTimeReduce).',
  },
};

// Key: misc/event/<slug>, in the order of the Misc tab.
export const MISC_EVENTS: Record<string, MiscEventSource> = {
  'misc/event/tower-xp-creeps': {
    name: 'Tower XP creeps',
    sideId: null,
    effects: [{ kind: 'grant', hexite: 40, flux: 0 }],
    lines: ['+40 Hexite'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: '8 Elder Arkanid x 5 Hexite (Base Scrap Kill Reward), no respawn.',
  },
  'misc/event/reinforcements-commando': {
    name: 'Reinforcements · 6 Commando',
    sideId: 'protectorate',
    effects: [{ kind: 'spawn-units', entityId: 'protectorate/unit/commando', count: 6, waitsForSupply: true }],
    lines: ['6 Commando', '{supply} supply'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: REINFORCEMENTS_NOTE,
  },
  'misc/event/reinforcements-bastion': {
    name: 'Reinforcements · 3 Bastion',
    sideId: 'protectorate',
    effects: [{ kind: 'spawn-units', entityId: 'protectorate/unit/bastion', count: 3, waitsForSupply: true }],
    lines: ['3 Bastion', '{supply} supply'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: REINFORCEMENTS_NOTE,
  },
  'misc/event/reinforcements-sentinel': {
    name: 'Reinforcements · 2 Sentinel',
    sideId: 'protectorate',
    effects: [{ kind: 'spawn-units', entityId: 'protectorate/unit/sentinel', count: 2, waitsForSupply: true }],
    lines: ['2 Sentinel', '{supply} supply'],
    status: 'confirmed',
    owner: 'Kieirra',
    note: REINFORCEMENTS_NOTE,
  },
};
