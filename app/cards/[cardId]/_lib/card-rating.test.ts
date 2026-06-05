import { describe, expect, it } from 'vitest';
import { formatRating } from '@/lib/tcg-data';
import { ratingCountLabel, starFills } from './card-rating';

describe('starFills', () => {
  it('treats a missing average as all-empty stars', () => {
    expect(starFills(null)).toEqual([0, 0, 0, 0, 0]);
  });

  it('fills whole stars and partially fills the fractional one', () => {
    expect(starFills(4.2)).toEqual([1, 1, 1, 1, 0.2]);
  });

  it('fills every star at the maximum score', () => {
    expect(starFills(5)).toEqual([1, 1, 1, 1, 1]);
  });
});

describe('ratingCountLabel', () => {
  it('shows an empty-state label when there are no ratings', () => {
    expect(ratingCountLabel({ average: null, count: 0 })).toBe('아직 평가가 없습니다');
  });

  it('shows a formatted count when ratings exist', () => {
    expect(ratingCountLabel({ average: 4.2, count: 1234 })).toBe('1,234개 평가');
  });
});

describe('formatRating', () => {
  it('renders a placeholder when there is no average', () => {
    expect(formatRating(null)).toBe('평가 없음');
  });

  it('renders one decimal place', () => {
    expect(formatRating(4)).toBe('4.0');
    expect(formatRating(3.25)).toBe('3.3');
  });
});
