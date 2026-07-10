'use client';

import { useMemo, useState } from 'react';
import { SegmentedControl, SegmentedControlItem } from '@tcground/ui';
import type { PricePoint } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';
import {
  CHART_PERIODS,
  DEFAULT_CHART_PERIOD,
  buildChartGeometry,
  filterSeriesByPeriod,
  type ChartPeriod,
} from '../_lib/price-chart';

interface PriceHistoryChartProps {
  /** Coherent trend series drawn as the line (asking, or sold when asking is absent). */
  trendSeries: PricePoint[];
  /** Comparable sold points overlaid on the trend when an asking line is present. */
  overlaySold: PricePoint[];
  /** Whether any history exists at all (drives the empty state). */
  hasData: boolean;
  /** Grade of the trend series when it is a graded fallback (e.g. "PSA 10"); null when raw. */
  gradeLabel?: string | null;
}

/**
 * Interactive price-history chart. The period panel filters the trend window in
 * place; hovering tracks the nearest day and surfaces its price in a tooltip.
 * Overlay sold points are clamped to the active window by `buildChartGeometry`.
 */
export function PriceHistoryChart({
  trendSeries,
  overlaySold,
  hasData,
  gradeLabel,
}: PriceHistoryChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>(DEFAULT_CHART_PERIOD);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const filteredSeries = useMemo(
    () => filterSeriesByPeriod(trendSeries, period),
    [trendSeries, period],
  );
  // Overlay is filtered to the trend window inside buildChartGeometry, so we pass
  // the full set and let the geometry drop anything outside the active window.
  const geometry = useMemo(
    () => buildChartGeometry(filteredSeries, overlaySold, { today: new Date() }),
    [filteredSeries, overlaySold],
  );

  const periodRange = useMemo(() => summarizeRange(filteredSeries), [filteredSeries]);
  const hasWindowData = filteredSeries.length > 0 || geometry.overlayPoints.length > 0;

  const activeIndex =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < geometry.linePoints.length
      ? hoverIndex
      : null;
  const activePoint = activeIndex !== null ? filteredSeries[activeIndex] : null;
  const activeCoord = activeIndex !== null ? geometry.linePoints[activeIndex] : null;

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (geometry.linePoints.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratioX = ((event.clientX - rect.left) / rect.width) * 100;
    setHoverIndex(nearestPointIndex(geometry.linePoints, ratioX));
  }

  return (
    <section aria-labelledby='price-history-heading' className='mt-8 rounded-2xl bg-card p-6'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <h3 id='price-history-heading' className='text-2xl leading-[1.2] font-bold text-foreground'>
            가격 변동 추이
          </h3>
          {gradeLabel && (
            <span className='rounded-full bg-muted px-2.5 py-1 text-xs leading-none font-semibold text-foreground'>
              {gradeLabel} 체결가 기준
            </span>
          )}
        </div>
        <SegmentedControl
          value={period}
          onValueChange={(value) => {
            setPeriod(value as ChartPeriod);
            setHoverIndex(null);
          }}
          aria-label='차트 기간'
        >
          {CHART_PERIODS.map((option) => (
            <SegmentedControlItem key={option.value} value={option.value}>
              {option.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      {!hasData ? (
        <ChartMessage>
          아직 가격 표본을 수집 중입니다. 매일 판매 데이터를 모아 추이를 채워갑니다.
        </ChartMessage>
      ) : !hasWindowData ? (
        <ChartMessage>선택한 기간에는 가격 데이터가 없습니다. 더 긴 기간을 선택해 보세요.</ChartMessage>
      ) : (
        <div
          className='relative h-56 w-full overflow-hidden rounded-xl bg-background'
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <svg
            className='h-full w-full'
            viewBox='0 0 100 50'
            preserveAspectRatio='none'
            aria-hidden='true'
          >
            <defs>
              <linearGradient id='card-detail-chart-gradient' x1='0' x2='0' y1='0' y2='1'>
                <stop offset='0%' stopColor='var(--tcg-red)' stopOpacity='0.25' />
                <stop offset='100%' stopColor='var(--tcg-red)' stopOpacity='0' />
              </linearGradient>
            </defs>
            {geometry.areaPath && (
              <path d={geometry.areaPath} fill='url(#card-detail-chart-gradient)' />
            )}
            {geometry.linePath && (
              <path
                d={geometry.linePath}
                fill='none'
                stroke='var(--tcg-red)'
                strokeWidth='2'
                vectorEffect='non-scaling-stroke'
              />
            )}
            {geometry.carryForwardPath && (
              <path
                d={geometry.carryForwardPath}
                fill='none'
                stroke='var(--tcg-red)'
                strokeWidth='2'
                strokeDasharray='3 3'
                strokeOpacity='0.5'
                vectorEffect='non-scaling-stroke'
              />
            )}
          </svg>

          {geometry.linePoints.length === 1 && (
            <ChartDot point={geometry.linePoints[0]} className='bg-tcg-red' />
          )}
          {geometry.overlayPoints.map((point, index) => (
            <ChartDot key={index} point={point} className='border-2 border-tcg-red bg-card' />
          ))}

          {activeCoord && (
            <span
              className='pointer-events-none absolute top-0 bottom-0 w-px bg-tcg-red/40'
              style={{ left: `${activeCoord.x}%` }}
              aria-hidden
            />
          )}
          {activeCoord && (
            <ChartDot point={activeCoord} className='ring-2 ring-white bg-tcg-red' />
          )}
          {activePoint && activeCoord && (
            <ChartTooltip point={activePoint} x={activeCoord.x} />
          )}
        </div>
      )}

      {hasData && hasWindowData && periodRange && (
        <p className='mt-3 text-sm text-muted-foreground'>
          선택 기간 최저{' '}
          <span className='font-semibold text-foreground tabular-nums'>
            {formatPrice(periodRange.low, periodRange.currency)}
          </span>{' '}
          · 최고{' '}
          <span className='font-semibold text-foreground tabular-nums'>
            {formatPrice(periodRange.high, periodRange.currency)}
          </span>
        </p>
      )}

      {hasData && hasWindowData && geometry.overlayPoints.length > 0 && (
        <div className='mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
          <span className='flex items-center gap-2'>
            <span className='h-2.5 w-2.5 rounded-full bg-tcg-red' aria-hidden />
            판매중 호가 추이
          </span>
          <span className='flex items-center gap-2'>
            <span className='h-2.5 w-2.5 rounded-full border-2 border-tcg-red bg-card' aria-hidden />
            실거래가 (참조)
          </span>
        </div>
      )}
    </section>
  );
}

function ChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex h-56 w-full items-center justify-center rounded-xl bg-background px-6 text-center text-sm text-muted-foreground'>
      {children}
    </div>
  );
}

function ChartDot({ point, className }: { point: { x: number; y: number }; className: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${className}`}
      style={{ left: `${point.x}%`, top: `${(point.y / 50) * 100}%` }}
      aria-hidden
    />
  );
}

function ChartTooltip({ point, x }: { point: PricePoint; x: number }) {
  // Clamp the anchor so the centered tooltip never spills past the chart edges.
  const clampedX = Math.min(88, Math.max(12, x));
  return (
    <div
      className='pointer-events-none absolute top-3 z-10 -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-center whitespace-nowrap text-background shadow-lg'
      style={{ left: `${clampedX}%` }}
    >
      <p className='text-sm leading-none font-bold tabular-nums'>
        {formatPrice(point.avgPrice, point.currency)}
      </p>
      <p className='mt-1 text-xs leading-none text-background/70 tabular-nums'>
        {formatChartDate(point.date)}
      </p>
    </div>
  );
}

/** Index of the line point whose x is closest to the cursor's x (0..100). */
function nearestPointIndex(points: ReadonlyArray<{ x: number }>, ratioX: number): number {
  let nearest = 0;
  let nearestDistance = Infinity;
  points.forEach((coord, index) => {
    const distance = Math.abs(coord.x - ratioX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });
  return nearest;
}

function summarizeRange(
  series: readonly PricePoint[],
): { low: number; high: number; currency: string } | null {
  if (series.length === 0) return null;
  const prices = series.map((point) => point.avgPrice);
  return {
    low: Math.min(...prices),
    high: Math.max(...prices),
    currency: series[0].currency,
  };
}

function formatChartDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(parsed);
}
