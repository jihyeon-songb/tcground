import { describe, expect, it } from 'vitest';
import { isThresholdMet } from './evaluate';

describe('isThresholdMet', () => {
  it('below: 현재가가 임계값보다 낮으면 true', () => {
    expect(isThresholdMet('below', 9000, 10000)).toBe(true);
  });
  it('below: 현재가가 임계값과 같으면 true (도달 포함)', () => {
    expect(isThresholdMet('below', 10000, 10000)).toBe(true);
  });
  it('below: 현재가가 임계값보다 높으면 false', () => {
    expect(isThresholdMet('below', 11000, 10000)).toBe(false);
  });
  it('above: 현재가가 임계값보다 높으면 true', () => {
    expect(isThresholdMet('above', 11000, 10000)).toBe(true);
  });
  it('above: 현재가가 임계값과 같으면 true', () => {
    expect(isThresholdMet('above', 10000, 10000)).toBe(true);
  });
  it('above: 현재가가 임계값보다 낮으면 false', () => {
    expect(isThresholdMet('above', 9000, 10000)).toBe(false);
  });
});
