import type { PricePoint, PriceDisplay } from '@/lib/tcg-catalog';

// Same drawing band as the detail chart's `0 0 100 50` viewBox.
const CHART_Y_TOP = 6;
const CHART_Y_BOTTOM = 44;

export interface IndexedPoint {
  date: string;
  /** Absolute avgPrice, kept for the hover readout. */
  raw: number;
  /** 100 = the series' first positive point. */
  index: number;
}

export interface CompareLine {
  points: Array<{ x: number; y: number; date: string; raw: number; index: number }>;
  linePath: string;
}

export interface CompareGeometry {
  left: CompareLine;
  right: CompareLine;
  indexLow: number;
  indexHigh: number;
  /** True when at least one side has 2+ points (i.e. an actual line, not a dot). */
  hasLine: boolean;
}

export interface CompareStat {
  current: number | null;
  low: number | null;
  high: number | null;
  /** Fraction over the window: (last - first) / first. null when < 2 points. */
  changeRate: number | null;
  currency: string | null;
}

/**
 * Indexes a chronologically-ascending series to 100 at its first positive point.
 * Leading non-positive points can't anchor a ratio, so they're dropped.
 */
export function indexSeries(series: readonly PricePoint[]): IndexedPoint[] {
  const base = series.find((p) => p.avgPrice > 0);
  if (!base) return [];
  const baseTime = new Date(base.date).getTime();
  return series
    .filter((p) => new Date(p.date).getTime() >= baseTime && p.avgPrice > 0)
    .map((p) => ({ date: p.date, raw: p.avgPrice, index: (p.avgPrice / base.avgPrice) * 100 }));
}

function emptyLine(): CompareLine {
  return { points: [], linePath: '' };
}

/**
 * Maps both indexed series onto a shared time x-axis (0..100) and a shared index
 * y-axis. Both sides share scales so "+12% vs -5%" reads directly off the chart.
 */
export function buildCompareGeometry(
  left: readonly PricePoint[],
  right: readonly PricePoint[],
): CompareGeometry {
  const leftIdx = indexSeries(left);
  const rightIdx = indexSeries(right);
  const all = [...leftIdx, ...rightIdx];

  if (all.length === 0) {
    return { left: emptyLine(), right: emptyLine(), indexLow: 100, indexHigh: 100, hasLine: false };
  }

  const times = all.map((p) => new Date(p.date).getTime());
  const indices = all.map((p) => p.index);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const indexLow = Math.min(...indices);
  const indexHigh = Math.max(...indices);

  const xOf = (date: string) =>
    maxTime === minTime ? 50 : ((new Date(date).getTime() - minTime) / (maxTime - minTime)) * 100;
  const yOf = (index: number) =>
    indexHigh === indexLow
      ? (CHART_Y_TOP + CHART_Y_BOTTOM) / 2
      : CHART_Y_BOTTOM - ((index - indexLow) / (indexHigh - indexLow)) * (CHART_Y_BOTTOM - CHART_Y_TOP);

  const toLine = (pts: IndexedPoint[]): CompareLine => {
    const points = pts.map((p) => ({
      x: xOf(p.date),
      y: yOf(p.index),
      date: p.date,
      raw: p.raw,
      index: p.index,
    }));
    const linePath = points
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
      .join(' ');
    return { points, linePath };
  };

  return {
    left: toLine(leftIdx),
    right: toLine(rightIdx),
    indexLow,
    indexHigh,
    hasLine: leftIdx.length >= 2 || rightIdx.length >= 2,
  };
}

/** Absolute-price stats for one side over the given (already period-filtered) series. */
export function computeCompareStat(
  series: readonly PricePoint[],
  price: PriceDisplay | null,
): CompareStat {
  if (series.length === 0) {
    return {
      current: price?.avgPrice ?? null,
      low: price?.minPrice ?? null,
      high: price?.maxPrice ?? null,
      changeRate: null,
      currency: price?.currency ?? null,
    };
  }
  const prices = series.map((p) => p.avgPrice);
  const first = series.find((p) => p.avgPrice > 0)?.avgPrice ?? null;
  const last = series[series.length - 1].avgPrice;
  return {
    current: price?.avgPrice ?? last,
    low: Math.min(...prices),
    high: Math.max(...prices),
    changeRate: first ? (last - first) / first : null,
    currency: series[0].currency,
  };
}
