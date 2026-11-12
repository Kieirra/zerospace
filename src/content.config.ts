import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { MAIN_FACTION_ORDER } from './guides/guides.constants.ts';
import type {
  Ability,
  Cost,
  EconomyStat,
  EnergyCostChange,
  PatchNote,
  PatchNoteLine,
  PatchNoteMismatch,
  Stat,
  TopbarEnergyCost,
  Weapon,
} from './wiki/wiki-data.types.ts';

const generateId = ({ data }: { data: Record<string, unknown> }) => String(data.id);

const ids = z.array(z.string());
const descriptionValues = z.record(z.string(), z.union([z.number(), z.array(z.number()), z.string()]));

const patchNoteMismatch: z.ZodType<PatchNoteMismatch> = z.union([z.string(), z.object({ tooltip: z.string() })]);

const cost: z.ZodType<Cost> = z.object({
  hexite: z.number().optional(),
  flux: z.number().optional(),
});

const weapon: z.ZodType<Weapon> = z.looseObject({
  minRange: z.number().optional(),
  splashRadius: z.number().optional(),
  splashDamage: z.number().optional(),
  patchNotes: z.record(z.string(), patchNoteMismatch).optional(),
  name: z.string().optional(),
  damage: z.number().optional(),
  cooldown: z.number().optional(),
  burst: z.number().optional(),
  burstCooldown: z.number().optional(),
  range: z.number().optional(),
  warmup: z.number().optional(),
  projectileSpeed: z.number().optional(),
  melee: z.boolean().optional(),
  dps: z.number().optional(),
  kind: z.enum(['damage', 'heal']).optional(),
  targets: z.array(z.string()).optional(),
  excludedTargets: z.array(z.string()).optional(),
  bonuses: z
    .array(z.looseObject({ vs: z.string(), value: z.number(), unit: z.literal('%') }))
    .optional(),
});

const gameStats: z.ZodType<Stat[]> = z.array(
  z.looseObject({
    label: z.string(),
    value: z.union([z.number(), z.array(z.number())]),
    unit: z.enum(['%', 's', '/s', 'x']).optional(),
    levels: z.array(z.number()).optional(),
    patchNote: patchNoteMismatch.optional(),
  }),
);

const economy: z.ZodType<EconomyStat[]> = z.array(
  z.looseObject({
    label: z.string(),
    value: z.union([z.number(), z.array(z.number())]),
    unit: z.enum(['/min', '/s', 's', '%', 'x']).optional(),
    levels: z.array(z.number()).optional(),
  }),
);

const ability: z.ZodType<Ability> = z.looseObject({
  targets: ids.optional(),
  excludedTargets: ids.optional(),
  name: z.string(),
  description: z.string().optional(),
  values: descriptionValues.optional(),
  hotkey: z.string().optional(),
  cooldown: z.number().optional(),
  energyCost: z.number().optional(),
  range: z.number().optional(),
  charges: z.number().optional(),
  stats: gameStats.optional(),
  patchNotes: z.record(z.string(), patchNoteMismatch).optional(),
});

const topbarEnergyCost: z.ZodType<TopbarEnergyCost> = z.looseObject({
  unitCostMultiplier: z.number().optional(),
  structureCostMultiplier: z.number().optional(),
  supplyCostMultiplier: z.number().optional(),
  fluxWeight: z.number().optional(),
  base: z.number().optional(),
  hero: z.number().optional(),
  massive: z.number().optional(),
  targets: z.record(z.string(), z.number()).optional(),
});

const energyCostChange: z.ZodType<EnergyCostChange> = z.looseObject({
  energyCost: z.number().optional(),
  unitCostMultiplier: z.number().optional(),
  structureCostMultiplier: z.number().optional(),
  supplyCostMultiplier: z.number().optional(),
  base: z.number().optional(),
});

const turret = z.looseObject({
  name: z.string(),
  description: z.string().optional(),
  values: descriptionValues.optional(),
  cost: cost.optional(),
  buildTime: z.number().optional(),
  hp: z.number().optional(),
  combatStats: gameStats.optional(),
  transport: z.object({ capacity: z.number().optional(), unitCapacity: z.number().optional(), targets: ids.optional(), excludedTargets: ids.optional() }).optional(),
  armor: z.number().optional(),
  armorType: z.string().optional(),
  weapons: z.array(weapon).optional(),
});

const summon = z.looseObject({
  name: z.string(),
  kind: z.string().optional(),
  id: z.string().optional(),
  count: z.number().optional(),
  duration: z.number().optional(),
  hp: z.number().optional(),
  combatStats: gameStats.optional(),
  transport: z.object({ capacity: z.number().optional(), unitCapacity: z.number().optional(), targets: ids.optional(), excludedTargets: ids.optional() }).optional(),
  shields: z.number().optional(),
  armor: z.number().optional(),
  armorType: z.string().optional(),
  armorRating: z.number().optional(),
  speed: z.number().optional(),
  vision: z.number().optional(),
  weapons: z.array(weapon).optional(),
  abilities: z.array(ability).optional(),
});

const area = z.looseObject({
  damage: z.number().optional(),
  interval: z.number().optional(),
  radius: z.number().optional(),
  duration: z.number().optional(),
  shots: z.number().optional(),
});

const factions = defineCollection({
  loader: glob({ base: './data/wiki', pattern: ['*.json', '!source.json', '!_report.json'], generateId }),
  schema: z.looseObject({
    id: z.string(),
    loadBonuses: z.array(z.object({ name: z.string(), recipient: z.enum(['carrier', 'passenger']), units: ids.optional(), description: z.string().optional(), stats: gameStats.optional() })).optional(),
    targets: ids.optional(),
    excludedTargets: ids.optional(),
    kind: z.enum(['faction', 'mercenary']),
    name: z.string(),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
  }),
});

const entities = defineCollection({
  loader: glob({ base: './data/wiki', pattern: '*/*/*.json', generateId }),
  schema: z.looseObject({
    id: z.string(),
    loadBonuses: z.array(z.object({ name: z.string(), recipient: z.enum(['carrier', 'passenger']), units: ids.optional(), description: z.string().optional(), stats: gameStats.optional() })).optional(),
    targets: ids.optional(),
    excludedTargets: ids.optional(),
    kind: z.enum(['unit', 'hero', 'building', 'topbar', 'talent', 'upgrade']),
    faction: z.string(),
    name: z.string(),
    order: z.number().optional(),
    description: z.string().optional(),
    details: z.string().optional(),
    stats: gameStats.optional(),
    values: descriptionValues.optional(),
    hotkey: z.string().optional(),
    cost: cost.optional(),
    count: z.number().optional(),
    buildTime: z.number().optional(),
    researchTime: z.number().optional(),
    supply: z.number().optional(),
    hp: z.number().optional(),
  combatStats: gameStats.optional(),
  transport: z.object({ capacity: z.number().optional(), unitCapacity: z.number().optional(), targets: ids.optional(), excludedTargets: ids.optional() }).optional(),
    shields: z.number().optional(),
    armor: z.number().optional(),
    armorRating: z.number().optional(),
    armorType: z.string().optional(),
    energy: z.number().optional(),
    speed: z.number().optional(),
    vision: z.number().optional(),
    weapons: z.array(weapon).optional(),
    abilities: z.array(ability).optional(),
    cooldown: z.number().optional(),
    range: z.number().optional(),
    charges: z.number().optional(),
    upgradesTo: z
      .array(
        z.looseObject({
          id: z.string(),
          targets: ids.optional(),
          excludedTargets: ids.optional(),
          upgrade: z.string().optional(),
          cost: cost.optional(),
          researchTime: z.number().optional(),
        }),
      )
      .optional(),
    economy: economy.optional(),
    heals: z
      .array(
        z.looseObject({
          name: z.string(),
          amount: z.number().optional(),
          perSecond: z.number().optional(),
          interval: z.number().optional(),
          radius: z.number().optional(),
          duration: z.number().optional(),
          targetSwap: z.number().optional(),
          targets: z.array(z.string()).optional(),
        }),
      )
      .optional(),
    upgradedFrom: z.string().optional(),
    mergedFrom: z.array(z.looseObject({ id: z.string(), count: z.number() })).optional(),
    mergesInto: ids.optional(),
    mergeForms: z
      .array(
        z.looseObject({
          with: z.string(),
          stats: gameStats.optional(),
          abilities: z.array(ability).optional(),
          weapons: z.array(weapon).optional(),
        }),
      )
      .optional(),
    transformsInto: z.string().optional(),
    maxTurrets: z.number().optional(),
    turrets: z.array(turret).optional(),
    summons: z.array(summon).optional(),
    area: area.optional(),
    energyCost: z.union([z.number(), topbarEnergyCost]).optional(),
    energyCostChanges: z.record(z.string(), energyCostChange).optional(),
    topbarEnergyCosts: z.record(z.string(), z.number()).optional(),
    tier: z.string().optional(),
    exclusiveGroup: z.string().optional(),
    level: z.number().optional(),
    position: z.string().optional(),
    appliesTo: ids.optional(),
    producedBy: ids.optional(),
    produces: ids.optional(),
    productionCharges: z.object({ initial: z.number(), max: z.number(), recharge: z.number() }).optional(),
    supplyProvided: z.number().optional(),
    requires: ids.optional(),
    unlocks: ids.optional(),
    upgrades: ids.optional(),
  }),
});

const patchNoteLine: z.ZodType<PatchNoteLine> = z.lazy(() =>
  z.strictObject({
    text: z.string(),
    lines: z.array(patchNoteLine).optional(),
  }),
);

const patchNote: z.ZodType<PatchNote> = z.strictObject({
  id: z.string(),
  label: z.string(),
  title: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  url: z.string(),
  sections: z.array(
    z.strictObject({
      faction: z.string().nullable(),
      heading: z.string(),
      entries: z.array(
        z.strictObject({
          subject: z.string().nullable(),
          entityIds: ids,
          kind: z.literal('fix').optional(),
          lines: z.array(patchNoteLine),
          note: z.string().optional(),
        }),
      ),
    }),
  ),
});

const patchNotes = defineCollection({
  loader: glob({ pattern: ['*.json', '!_report.json'], base: './data/patch-notes', generateId }),
  schema: patchNote,
});

const mainFaction = z.enum(MAIN_FACTION_ORDER);

// Fields that need the faction scope are checked in guides.data.ts.
const guides = defineCollection({
  loader: glob({ base: './data/guides', pattern: ['*.md', '!README.md'] }),
  schema: z.strictObject({
    title: z.string().min(3).max(60),
    author: z.string().min(1),
    description: z.string().min(40).max(240),
    patch: z.int().positive().optional(),
    added: z.coerce.date(),
    faction: mainFaction.optional(),
    mercenary: z.enum(['arandi', 'chakru-kingdom', 'endari', 'free-corsairs', 'marran', 'valkaru']).optional(),
    hero: z.string().optional(),
    talents: z
      .union([z.string(), z.number()])
      .transform(String)
      .pipe(z.string().regex(/^[12]{7}$/))
      .optional(),
    army: z.array(z.string()).min(1).optional(),
    vs: z.partialRecord(mainFaction, z.int().min(1).max(5)).optional(),
    style: z.enum(['one-base', 'expand', 'all-in']).optional(),
    strengths: z.array(z.string()).min(1).max(6).optional(),
    weaknesses: z.array(z.string()).min(1).max(6).optional(),
  }),
});

export const collections = { factions, entities, patchNotes, guides };
