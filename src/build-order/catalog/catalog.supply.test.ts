import { describe, expect, it } from 'vitest';
import { toSupplyProvided } from './catalog.helpers.ts';

describe('Supply provided', () => {
  const building = { id: 'grell/building/nourishing-pod' };

  it('should read the supply field of the data first', () => {
    expect(toSupplyProvided({ ...building, supplyProvided: 8, description: 'Provides supply.' })).toBe(8);
  });

  it('should read the supply value next', () => {
    expect(toSupplyProvided({ ...building, values: { supply: 12 }, description: 'Provides 10 Supply.' })).toBe(12);
  });

  it('should read the amount in the description', () => {
    expect(toSupplyProvided({ ...building, description: 'Provides 12 Supply.\nCan be upgraded.' })).toBe(12);
  });

  it('should be null when the description gives no amount', () => {
    expect(toSupplyProvided({ ...building, description: 'Provides supply. Enables building.' })).toBeNull();
  });

  it('should prefer the override to an unknown amount', () => {
    expect(toSupplyProvided({ ...building, description: 'Provides supply.' }, { [building.id]: 8 })).toBe(8);
  });

  it('should be undefined when the entity provides no supply', () => {
    expect(toSupplyProvided({ ...building, description: 'Basic infantry production structure.' })).toBeUndefined();
  });
});
