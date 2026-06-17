import { describe, expect, it } from 'vitest';
import { koreanCardNameToEnglish } from './korean-card-name';

describe('koreanCardNameToEnglish', () => {
  it('translates a bare species', () => {
    expect(koreanCardNameToEnglish('팬텀')).toBe('Gengar');
  });

  it('keeps latin suffixes', () => {
    expect(koreanCardNameToEnglish('뮤 ex')).toBe('Mew ex');
    expect(koreanCardNameToEnglish('가라르 나이킹 V')).toBe('Galarian Perrserker V');
  });

  it('translates a Mega prefix + species', () => {
    expect(koreanCardNameToEnglish('메가 팬텀 ex')).toBe('Mega Gengar ex');
  });

  it('translates a Mega prefix written without a space', () => {
    expect(koreanCardNameToEnglish('메가이상해꽃 ex')).toBe('Mega Venusaur ex');
  });

  it('translates an Alolan prefix + species', () => {
    expect(koreanCardNameToEnglish('알로라 나시 ex')).toBe('Alolan Exeggutor ex');
  });

  it('does not mis-strip a prefix that is part of a species name', () => {
    // 메가톤 블로어 is a Trainer/Item, not "Mega + 톤 블로어".
    expect(koreanCardNameToEnglish('메가톤 블로어')).toBeNull();
  });

  it('returns null for non-Pokémon cards', () => {
    expect(koreanCardNameToEnglish('박사의 연구')).toBeNull();
  });
});
