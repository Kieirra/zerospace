import { describe, expect, it } from 'vitest';
import { splitResourceWords } from './resource-words.ts';

describe('Resource words', () => {
  it('keeps the amount written before a resource', () => {
    expect(splitResourceWords('gives 504 hexite per minute')).toEqual(['gives ', { resource: 'hexite', amount: '504' }, ' per minute']);
  });

  it('keeps a range of amounts', () => {
    expect(splitResourceWords('cost 50 to 100 hexite')).toEqual(['cost ', { resource: 'hexite', amount: '50 to 100' }]);
  });

  it('cuts a resource word without amount', () => {
    expect(splitResourceWords('the flux harvesters')).toEqual(['the ', { resource: 'flux' }, ' harvesters']);
  });

  it('leaves a capitalised name as written', () => {
    expect(splitResourceWords('Lore of Flux and the Supply Platform')).toEqual(['Lore of Flux and the Supply Platform']);
  });

  it('only matches whole words', () => {
    expect(splitResourceWords('supplying fluxes')).toEqual(['supplying fluxes']);
  });
});
