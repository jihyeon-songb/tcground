import { describe, expect, it } from 'vitest';
import type { PricePoint } from '@/lib/tcg-catalog';
import { buildChartGeometry, filterSeriesByPeriod } from './price-chart';

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

describe('buildChartGeometry carry-forward', () => {
  const series = [point('2026-05-20', 100), point('2026-05-22', 120)];

  it('emits no carry-forward path when today matches the latest point', () => {
    const geometry = buildChartGeometry(series, [], { today: new Date('2026-05-22T00:00:00Z') });
    expect(geometry.carryForwardPath).toBe('');
  });

  it('extends a flat dashed segment to today when the latest point is stale', () => {
    const geometry = buildChartGeometry(series, [], { today: new Date('2026-05-29T00:00:00Z') });
    // 오늘이 새 x축 최댓값(=100)이 되고, 마지막 실측점은 100 미만으로 압축된다.
    expect(geometry.carryForwardPath).not.toBe('');
    expect(geometry.carryForwardPath).toContain('L100.00,');
    expect(geometry.linePoints[geometry.linePoints.length - 1].x).toBeLessThan(100);
  });

  it('omits carry-forward when no today is provided', () => {
    const geometry = buildChartGeometry(series, []);
    expect(geometry.carryForwardPath).toBe('');
  });

  it('keeps a single stale point centered instead of clipping it at the left edge', () => {
    const geometry = buildChartGeometry(
      [point('2026-05-20', 100)],
      [],
      { today: new Date('2026-05-29T00:00:00Z') },
    );
    expect(geometry.linePoints).toHaveLength(1);
    expect(geometry.linePoints[0].x).toBe(50);
    expect(geometry.carryForwardPath).toContain('M50.00,');
    expect(geometry.carryForwardPath).toContain('L100.00,');
  });
});
