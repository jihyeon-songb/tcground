import { describe, expect, it } from 'vitest';
import { getSafeNextPath } from './login-utils';

describe('getSafeNextPath', () => {
  it('keeps internal paths with query strings', () => {
    expect(getSafeNextPath('/cards/charizard?tab=prices')).toBe('/cards/charizard?tab=prices');
  });

  it('falls back for external URLs', () => {
    expect(getSafeNextPath('https://example.com/cards')).toBe('/');
  });

  it('falls back for protocol-relative URLs', () => {
    expect(getSafeNextPath('//example.com/cards')).toBe('/');
  });

  it('falls back for the login page to avoid redirect loops', () => {
    expect(getSafeNextPath('/login')).toBe('/');
  });

  it('falls back for the signup page to avoid redirect loops', () => {
    expect(getSafeNextPath('/signup')).toBe('/');
  });
});
