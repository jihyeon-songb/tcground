import type { CardRatingSummary } from '@/lib/tcg-catalog';

export const RATING_STARS = [1, 2, 3, 4, 5] as const;

/**
 * Fill ratio (0–1) for each of the 5 stars given an average score. Whole stars
 * fill completely; the fractional remainder partially fills the next star.
 */
export function starFills(average: number | null): number[] {
  const value = average ?? 0;
  return RATING_STARS.map((position) => {
    const fill = value - (position - 1);
    if (fill >= 1) return 1;
    if (fill <= 0) return 0;
    return Number(fill.toFixed(2));
  });
}

/** "12개 평가" style caption, or an empty-state label when there are none. */
export function ratingCountLabel(summary: CardRatingSummary): string {
  if (summary.count === 0) return '아직 평가가 없습니다';
  return `${summary.count.toLocaleString('ko-KR')}개 평가`;
}
