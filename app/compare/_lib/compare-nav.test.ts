import { describe, expect, it } from 'vitest';
import { changeCardHref } from './compare-nav';

describe('changeCardHref', () => {
  it('changing the right slot keeps the left card in the left slot', () => {
    expect(changeCardHref('right', 'kr-001-charizard-ex')).toBe('/compare?left=kr-001-charizard-ex');
  });

  it('changing the left slot keeps the right card in the right slot', () => {
    expect(changeCardHref('left', 'kr-002-mega-charizard-ex')).toBe('/compare?right=kr-002-mega-charizard-ex');
  });

  it('drops both slots when there is no sibling card', () => {
    expect(changeCardHref('left', null)).toBe('/compare');
  });

  it('encodes the sibling slug', () => {
    expect(changeCardHref('right', 'kr-트로피우스')).toBe(`/compare?left=${encodeURIComponent('kr-트로피우스')}`);
  });
});
