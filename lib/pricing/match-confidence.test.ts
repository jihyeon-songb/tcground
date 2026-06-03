import { describe, expect, it } from 'vitest';
import { computeMatchConfidence, normalize } from './match-confidence';

const umbreon = {
  names: ['Umbreon ex', 'ブラッキーex', '블래키 ex'],
  collectorNumber: '217/187',
  setTokens: ['SV8a', '테라스탈 페스타'],
};

describe('computeMatchConfidence', () => {
  it('scores a full name + number + set match near 1', () => {
    const score = computeMatchConfidence('Pokemon Umbreon ex SAR 217/187 SV8a Japanese', umbreon);
    expect(score).toBeCloseTo(1, 5);
  });

  it('matches the Korean name on a KREAM-style title', () => {
    const score = computeMatchConfidence('블래키 ex (SAR) 217/187 테라스탈 페스타', umbreon);
    expect(score).toBeCloseTo(1, 5);
  });

  it('matches the Japanese name when English is absent', () => {
    const target = { ...umbreon, names: [null, 'ブラッキーex', '블래키 ex'] };
    const score = computeMatchConfidence('ブラッキーex SAR 217/187', target);
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it('returns 0 for accessory listings even when the name matches', () => {
    expect(computeMatchConfidence('블래키 ex 슬리브 보호필름 217/187', umbreon)).toBe(0);
    expect(computeMatchConfidence('Umbreon ex toploader 217/187', umbreon)).toBe(0);
    expect(computeMatchConfidence('Lot of 10 Pokemon Umbreon ex 217/187', umbreon)).toBe(0);
  });

  it('does not treat "lot" inside another word as a bundle', () => {
    // "pilot" contains "lot" but must not trigger the accessory filter.
    const score = computeMatchConfidence('Umbreon ex pilot edition 217/187', umbreon);
    expect(score).toBeGreaterThan(0);
  });

  it('gives a partial number score when only the left number is present', () => {
    const score = computeMatchConfidence('Umbreon ex 217 promo', {
      ...umbreon,
      setTokens: [],
    });
    // name (0.5) + partial number (0.2)
    expect(score).toBeCloseTo(0.7, 5);
  });

  it('returns 0 when the name does not match at all', () => {
    expect(computeMatchConfidence('Charizard ex 201/165', umbreon)).toBeLessThan(0.5);
  });

  it('returns 0 for empty/blank titles', () => {
    expect(computeMatchConfidence('', umbreon)).toBe(0);
    expect(computeMatchConfidence(null, umbreon)).toBe(0);
  });
});

describe('normalize', () => {
  it('lowercases and collapses punctuation to single spaces', () => {
    expect(normalize('Umbreon  ex — 217/187!')).toBe('umbreon ex 217 187');
  });

  it('keeps Hangul and Japanese characters', () => {
    expect(normalize('블래키 ex / ブラッキー')).toBe('블래키 ex ブラッキー');
  });
});
