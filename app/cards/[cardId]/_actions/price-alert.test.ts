import { describe, expect, it } from 'vitest';
import { isValidThreshold } from './price-alert';

describe('isValidThreshold', () => {
  it('양수 통과', () => expect(isValidThreshold(10000)).toBe(true));
  it('0 이하 거부', () => expect(isValidThreshold(0)).toBe(false));
  it('음수 거부', () => expect(isValidThreshold(-1)).toBe(false));
  it('NaN 거부', () => expect(isValidThreshold(Number.NaN)).toBe(false));
});
