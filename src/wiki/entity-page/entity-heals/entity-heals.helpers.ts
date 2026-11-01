import type { Heal } from '../../wiki.types.ts';

// A heal named after its own entity says nothing: only a radius without duration reads as an aura,
// any other case gets no title rather than a guess.
export const toHealTitle = ({ name, radius, duration }: Heal, entityName: string) => {
  if (name !== entityName) return name;
  return radius !== undefined && duration === undefined ? 'Aura' : undefined;
};
