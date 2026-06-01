import type { PricePoint } from '@/lib/tcg-catalog';

/** Selectable windows for the price-history period panel. */
export const CHART_PERIODS = [
  { value: '7d', label: '7일', days: 7 },
  { value: '30d', label: '30일', days: 30 },
  { value: '90d', label: '90일', days: 90 },
  { value: '1y', label: '1년', days: 365 },
] as const;

export type ChartPeriod = (typeof CHART_PERIODS)[number]['value'];

/** Default window — matches the summary copy and keeps a reasonable trend span. */
export const DEFAULT_CHART_PERIOD: ChartPeriod = '90d';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PERIOD_DAYS: Record<ChartPeriod, number> = Object.fromEntries(
  CHART_PERIODS.map((period) => [period.value, period.days]),
) as Record<ChartPeriod, number>;

/**
 * Keeps only the points within `period` of the series' most recent date. The
 * window is anchored to the latest data point — not "now" — so seeded or stale
 * snapshot histories still render a window instead of going blank.
 */
export function filterSeriesByPeriod(
  series: readonly PricePoint[],
  period: ChartPeriod,
): PricePoint[] {
  if (series.length === 0) return [];

  const days = PERIOD_DAYS[period];
  const times = series.map((point) => new Date(point.date).getTime());
  const latest = Math.max(...times);
  const cutoff = latest - days * MS_PER_DAY;

  return series.filter((point) => new Date(point.date).getTime() >= cutoff);
}

export interface ChartGeometry {
  linePath: string;
  areaPath: string;
  linePoints: Array<{ x: number; y: number }>;
  overlayPoints: Array<{ x: number; y: number }>;
  hasData: boolean;
}

// Chart drawing band inside the `0 0 100 50` viewBox: the trend spans y 6..44,
// leaving headroom above and a baseline below for the filled area.
const CHART_Y_TOP = 6;
const CHART_Y_BOTTOM = 44;

/**
 * Maps the asking trend line and sold overlay points to SVG coordinates in a
 * `0 0 100 50` viewBox. Both axes are scaled to the asking series alone so the
 * trend line always fills the chart; sold points are overlaid only when they
 * fall inside that time window, with prices clamped to the drawing band so a
 * stray sale can't push them off-canvas.
 */
export function buildChartGeometry(
  series: readonly PricePoint[],
  overlay: readonly PricePoint[],
): ChartGeometry {
  // Scale to the asking series; fall back to the overlay only when there is no
  // trend line at all, so a sold-only history still renders.
  const scaleBasis = series.length > 0 ? series : overlay;
  if (scaleBasis.length === 0) {
    return { linePath: '', areaPath: '', linePoints: [], overlayPoints: [], hasData: false };
  }

  const times = scaleBasis.map((point) => new Date(point.date).getTime());
  const prices = scaleBasis.map((point) => point.avgPrice);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  const xOf = (date: string) =>
    maxTime === minTime ? 50 : ((new Date(date).getTime() - minTime) / (maxTime - minTime)) * 100;
  const yOf = (price: number) => {
    if (highPrice === lowPrice) return (CHART_Y_TOP + CHART_Y_BOTTOM) / 2;
    const y =
      CHART_Y_BOTTOM - ((price - lowPrice) / (highPrice - lowPrice)) * (CHART_Y_BOTTOM - CHART_Y_TOP);
    return Math.min(CHART_Y_BOTTOM, Math.max(CHART_Y_TOP, y));
  };

  const linePoints = series.map((point) => ({ x: xOf(point.date), y: yOf(point.avgPrice) }));
  const linePath = linePoints
    .map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x.toFixed(2)},${coord.y.toFixed(2)}`)
    .join(' ');
  const areaPath =
    linePoints.length > 0
      ? `M${linePoints[0].x.toFixed(2)},50 ${linePoints
          .map((coord) => `L${coord.x.toFixed(2)},${coord.y.toFixed(2)}`)
          .join(' ')} L${linePoints[linePoints.length - 1].x.toFixed(2)},50 Z`
      : '';

  // Drop overlay points outside the trend window — they have no real position on
  // an axis scaled to the asking series, and stretching the axis to include them
  // is what squashed the trend in the first place.
  const overlayPoints = overlay
    .filter((point) => {
      const time = new Date(point.date).getTime();
      return time >= minTime && time <= maxTime;
    })
    .map((point) => ({ x: xOf(point.date), y: yOf(point.avgPrice) }));

  return { linePath, areaPath, linePoints, overlayPoints, hasData: true };
}
