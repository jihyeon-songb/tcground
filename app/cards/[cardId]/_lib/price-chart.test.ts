import { describe, expect, it } from 'vitest';
import type { PricePoint } from '@/lib/tcg-catalog';
import { filterSeriesByPeriod } from './price-chart';

function point(date: string, avgPrice = 100): PricePoint {
  return {
    date,
    avgPrice,
    minPrice: avgPrice,
    maxPrice: avgPrice,
    sampleCount: 1,
    currency: 'USD',
    sourceNames: ['ebay_browse'],
  };
}

describe('filterSeriesByPeriod', () => {
  const series = [
    point('2026-01-01'),
    point('2026-04-01'),
    point('2026-05-22'),
    point('2026-05-29'),
  ];

  it('anchors the window to the latest data point, not the current date', () => {
    // 7d before the latest point (2026-05-29) keeps only 2026-05-22 and later.
    const result = filterSeriesByPeriod(series, '7d');

    expect(result.map((p) => p.date)).toEqual(['2026-05-22', '2026-05-29']);
  });

  it('widens the window for longer periods', () => {
    expect(filterSeriesByPeriod(series, '90d').map((p) => p.date)).toEqual([
      '2026-04-01',
      '2026-05-22',
      '2026-05-29',
    ]);
    expect(filterSeriesByPeriod(series, '1y')).toHaveLength(4);
  });

  it('returns an empty array for an empty series', () => {
    expect(filterSeriesByPeriod([], '30d')).toEqual([]);
  });
});
