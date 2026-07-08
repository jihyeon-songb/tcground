// app/compare/_lib/compare-chart.test.ts
import { describe, expect, it } from 'vitest';
import type { PricePoint } from '@/lib/tcg-catalog';
import { indexSeries, buildCompareGeometry, computeCompareStat } from './compare-chart';

function point(date: string, avgPrice: number, currency = 'KRW'): PricePoint {
  return {
    date,
    avgPrice,
    minPrice: avgPrice,
    maxPrice: avgPrice,
    sampleCount: 1,
    currency,
    sourceNames: ['ebay_browse'],
  };
}

describe('indexSeries', () => {
  it('indexes the first positive point to 100 and scales the rest', () => {
    const out = indexSeries([point('2026-01-01', 200), point('2026-01-02', 300)]);
    expect(out.map((p) => p.index)).toEqual([100, 150]);
    expect(out[1].raw).toBe(300);
  });

  it('returns empty when there is no positive price', () => {
    expect(indexSeries([point('2026-01-01', 0)])).toEqual([]);
  });

  it('anchors on the first positive point, dropping leading zeros', () => {
    const out = indexSeries([point('2026-01-01', 0), point('2026-01-02', 50), point('2026-01-03', 75)]);
    expect(out.map((p) => p.index)).toEqual([100, 150]);
  });
});

describe('buildCompareGeometry', () => {
  it('maps both indexed series into a shared 0..100 x and shared index y', () => {
    const geo = buildCompareGeometry(
      [point('2026-01-01', 100), point('2026-01-03', 120)],
      [point('2026-01-01', 500), point('2026-01-03', 450)],
    );
    expect(geo.hasLine).toBe(true);
    expect(geo.indexLow).toBe(90); // right dropped to 90
    expect(geo.indexHigh).toBe(120); // left rose to 120
    expect(geo.left.points[0].x).toBe(0);
    expect(geo.left.points[1].x).toBe(100);
    expect(geo.left.linePath.startsWith('M')).toBe(true);
  });

  it('renders a single point without a line (hasLine false, one point each)', () => {
    const geo = buildCompareGeometry([point('2026-01-01', 100)], [point('2026-01-01', 200)]);
    expect(geo.hasLine).toBe(false);
    expect(geo.left.points).toHaveLength(1);
    expect(geo.right.points).toHaveLength(1);
  });

  it('handles one empty side', () => {
    const geo = buildCompareGeometry([point('2026-01-01', 100), point('2026-01-02', 110)], []);
    expect(geo.left.points).toHaveLength(2);
    expect(geo.right.points).toHaveLength(0);
    expect(geo.hasLine).toBe(true);
  });

  it('returns a flat empty geometry when both sides are empty', () => {
    const geo = buildCompareGeometry([], []);
    expect(geo.hasLine).toBe(false);
    expect(geo.left.points).toHaveLength(0);
    expect(geo.right.points).toHaveLength(0);
  });
});

describe('computeCompareStat', () => {
  it('derives low/high/change from the series and prefers the price headline for current', () => {
    const stat = computeCompareStat(
      [point('2026-01-01', 100), point('2026-01-02', 150)],
      { avgPrice: 160, minPrice: 90, maxPrice: 170, changeRate: 0, changeTone: 'up', lastUpdatedAt: '', stalenessDays: 0, sourceLabel: '', currency: 'KRW', sampleCount: 1 } as never,
    );
    expect(stat.low).toBe(100);
    expect(stat.high).toBe(150);
    expect(stat.current).toBe(160);
    expect(stat.changeRate).toBeCloseTo(0.5);
    expect(stat.currency).toBe('KRW');
  });

  it('falls back to the price headline when the series is empty', () => {
    const stat = computeCompareStat([], { avgPrice: 80, minPrice: 70, maxPrice: 90, changeRate: 0, changeTone: 'flat', lastUpdatedAt: '', stalenessDays: 0, sourceLabel: '', currency: 'USD', sampleCount: 1 } as never);
    expect(stat).toEqual({ current: 80, low: 70, high: 90, changeRate: null, currency: 'USD' });
  });

  it('is all-null when there is neither series nor price', () => {
    expect(computeCompareStat([], null)).toEqual({ current: null, low: null, high: null, changeRate: null, currency: null });
  });
});
