import { formatAmount, formatClock, joinNames } from '../build-order.helpers.ts';
import { RESOURCE_NAMES } from './engine.constants.ts';
import type { Diagnostic, DiagnosticCode, DiagnosticSeverity, Resource } from './engine.types.ts';

export type NeverStartsCause =
  | { kind: 'resource'; resource: Resource; amount: number }
  | { kind: 'supply'; used: number; cap: number }
  | { kind: 'producer' }
  | { kind: 'no-producer' }
  | { kind: 'requirement' }
  | { kind: 'earlier-order' }
  | { kind: 'stack' };

const DIAGNOSTIC_SEVERITY: Record<DiagnosticCode, DiagnosticSeverity> = {
  'missing-requirement': 'error',
  'missing-producer': 'error',
  'duplicate-research': 'error',
  'exclusive-research': 'error',
  'duplicate-mercenary-building': 'error',
  'wrong-producer': 'error',
  'unknown-entity': 'error',
  'never-starts': 'error',
  'harvester-cap': 'error',
  'hero-not-in-pool': 'error',
  'hero-already-picked': 'error',
  'hero-duplicate': 'error',
  'hero-no-slot': 'error',
  'hero-not-buildable': 'error',
  'mercenary-not-allowed': 'error',
  'unknown-stack-rule': 'warning',
  'unknown-research-location': 'warning',
  'unknown-duration': 'warning',
  'unknown-producer': 'warning',
  'supply-not-checked': 'info',
  'flux-nodes-unknown': 'info',
};

export const missingRequirement = (names: string[], conjunction: 'or' | 'and') =>
  toDiagnostic('missing-requirement', `Requires ${joinNames(names, conjunction)}.`);

export const missingProducer = (names: string[]) =>
  toDiagnostic('missing-producer', `No ${joinNames(names, 'or')} to produce this.`);

export const wrongProducer = (name: string) => toDiagnostic('wrong-producer', `${name} can't make this unit.`);

// Times in seconds: the click time of the first one (Kieirra 2026-11-19, no step numbers any more).
export const duplicateResearch = (at: number) => toDiagnostic('duplicate-research', `Already researched at ${formatClock(at)}.`);

export const exclusiveResearch = (otherName: string, at: number) =>
  toDiagnostic('exclusive-research', `Only one of this group: ${otherName} is already at ${formatClock(at)}.`);

export const duplicateMercenaryBuilding = (name: string, copies: number, at: number) =>
  toDiagnostic(
    'duplicate-mercenary-building',
    `${copies === 1 ? 'Only one' : `At most ${copies}`} ${name} per match: already built at ${formatClock(at)}.`,
  );

export const unknownEntity = () => toDiagnostic('unknown-entity', 'Not in the current game data.');

export const neverStarts = (cause: NeverStartsCause) => toDiagnostic('never-starts', `Never starts: ${toCause(cause)}.`);

export const harvesterCap = (max: number, nodes: number, perNode: number) =>
  toDiagnostic(
    'harvester-cap',
    `Harvester limit reached: at most ${max} (${nodes} Flux nodes × ${perNode} per node), extra harvesters are ignored.`,
  );

export const unknownResearchLocation = () =>
  toDiagnostic('unknown-research-location', 'Research location unknown: timing not checked.');

export const unknownDuration = () => toDiagnostic('unknown-duration', 'Build time unknown: counted as 0:00.');

export const unknownProducer = () => toDiagnostic('unknown-producer', 'Production rule unknown: timing not checked.');

export const supplyNotChecked = () =>
  toDiagnostic('supply-not-checked', 'Supply cap unknown for this faction: supply is not checked.');

export const fluxNodesUnknown = (harvesterCount: number) =>
  toDiagnostic(
    'flux-nodes-unknown',
    `Flux nodes per base unknown: all ${harvesterCount} harvesters are counted as mining.`,
  );

export const heroNotInPool = (setupAt: number) =>
  toDiagnostic('hero-not-in-pool', `Hero not available with this faction and mercenary: no hero at ${formatClock(setupAt)}.`);

export const heroAlreadyPicked = (setupAt: number) =>
  toDiagnostic('hero-already-picked', `Already picked at match start: it spawns at your base at ${formatClock(setupAt)}.`);

// The time of the first one is known after the simulation: `withHeroStart` fills it.
export const heroDuplicate = () => toDiagnostic('hero-duplicate', 'Already built.');

export const withHeroStart = (diagnostic: Diagnostic, startAt: number | null) =>
  diagnostic.code === 'hero-duplicate' && startAt !== null
    ? { ...diagnostic, message: `Already built at ${formatClock(startAt)}.` }
    : diagnostic;

export const heroNoSlot = (max: number) => toDiagnostic('hero-no-slot', `No hero slot left: ${max} heroes at most.`);

export const heroNotBuildable = () =>
  toDiagnostic('hero-not-buildable', 'Heroes are picked at match start for this faction.');

export const mercenaryNotAllowed = () => toDiagnostic('mercenary-not-allowed', 'This faction plays without a mercenary.');

export const unknownStackRule = (max: number) =>
  toDiagnostic(
    'unknown-stack-rule',
    `Stack recharge unknown: more than ${max} recruits from one building may not be possible.`,
  );

export const withStep = (diagnostic: Diagnostic, stepUid: string): Diagnostic => ({ ...diagnostic, stepUid });

const toDiagnostic = (code: DiagnosticCode, message: string): Diagnostic => ({
  code,
  severity: DIAGNOSTIC_SEVERITY[code],
  message,
});

const toCause = (cause: NeverStartsCause) => {
  switch (cause.kind) {
    case 'resource':
      return `needs ${formatAmount(cause.amount)} more ${RESOURCE_NAMES[cause.resource]} and nothing produces it`;
    case 'supply':
      return `no supply left (${cause.used}/${cause.cap})`;
    case 'producer':
      return 'its building is never free';
    case 'no-producer':
      return 'its building is never ready';
    case 'requirement':
      return 'a required building is never ready';
    case 'earlier-order':
      return 'held behind an order that never starts';
    case 'stack':
      return 'never a mercenary slot';
  }
};
