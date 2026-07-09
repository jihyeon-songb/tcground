'use client';

import { useMemo, useState } from 'react';
import { Button } from '@tcground/ui';
import type { PricePoint, PriceDisplay } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';
import {
  CHART_PERIODS,
  DEFAULT_CHART_PERIOD,
  filterSeriesByPeriod,
  type ChartPeriod,
} from '@/app/cards/[cardId]/_lib/price-chart';
import {
  buildCompareGeometry,
  computeCompareStat,
  type CompareLine,
} from '../_lib/compare-chart';

export interface CompareSide {
  label: string;
  series: PricePoint[];
  price: PriceDisplay | null;
}

interface CompareViewProps {
  left: CompareSide;
  right: CompareSide;
}

export function CompareView({ left, right }: CompareViewProps) {
  const [period, setPeriod] = useState<ChartPeriod>(DEFAULT_CHART_PERIOD);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const leftSeries = useMemo(() => filterSeriesByPeriod(left.series, period), [left.series, period]);
  const rightSeries = useMemo(() => filterSeriesByPeriod(right.series, period), [right.series, period]);

  const geometry = useMemo(
    () => buildCompareGeometry(leftSeries, rightSeries),
    [leftSeries, rightSeries],
  );
  const leftStat = useMemo(() => computeCompareStat(leftSeries, left.price), [leftSeries, left.price]);
  const rightStat = useMemo(
    () => computeCompareStat(rightSeries, right.price),
    [rightSeries, right.price],
  );

  const hasWindowData = geometry.left.points.length > 0 || geometry.right.points.length > 0;
  const leftHover = hoverX !== null ? nearestPoint(geometry.left, hoverX) : null;
  const rightHover = hoverX !== null ? nearestPoint(geometry.right, hoverX) : null;

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!geometry.hasLine) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    setHoverX(((event.clientX - rect.left) / rect.width) * 100);
  }

  return (
    <section aria-labelledby='compare-heading' className='mt-8 rounded-2xl bg-card p-6'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h3 id='compare-heading' className='text-2xl leading-[1.2] font-bold text-foreground'>
          가격 변동 비교 <span className='text-base font-medium text-muted-foreground'>(시작일 = 100%)</span>
        </h3>
        <div
          className='flex items-center gap-1 rounded-full bg-muted p-1'
          role='tablist'
          aria-label='차트 기간'
        >
          {CHART_PERIODS.map((option) => {
            const isActive = option.value === period;
            return (
              <Button
                key={option.value}
                type='button'
                variant={isActive ? 'outline' : 'ghost'}
                size='tab'
                role='tab'
                aria-selected={isActive}
                onClick={() => {
                  setPeriod(option.value);
                  setHoverX(null);
                }}
                className={
                  isActive
                    ? 'bg-card text-foreground'
                    : 'text-muted-foreground hover:bg-transparent hover:text-foreground'
                }
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Legend + hover readout */}
      <div className='mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm'>
        <LegendRow color='bg-tcg-red' label={left.label} hover={leftHover} />
        <LegendRow color='bg-tcg-blue' label={right.label} hover={rightHover} />
      </div>

      {!hasWindowData ? (
        <div className='flex h-56 w-full items-center justify-center rounded-xl bg-background px-6 text-center text-sm text-muted-foreground'>
          선택한 기간에는 비교할 가격 데이터가 없습니다. 더 긴 기간을 선택해 보세요.
        </div>
      ) : (
        <div
          className='relative h-56 w-full overflow-hidden rounded-xl bg-background'
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverX(null)}
        >
          <svg className='h-full w-full' viewBox='0 0 100 50' preserveAspectRatio='none' aria-hidden='true'>
            {geometry.left.linePath && (
              <path d={geometry.left.linePath} fill='none' stroke='var(--tcg-red)' strokeWidth='2' vectorEffect='non-scaling-stroke' />
            )}
            {geometry.right.linePath && (
              <path d={geometry.right.linePath} fill='none' stroke='var(--tcg-blue)' strokeWidth='2' vectorEffect='non-scaling-stroke' />
            )}
          </svg>

          {geometry.left.points.length === 1 && <Dot point={geometry.left.points[0]} className='bg-tcg-red' />}
          {geometry.right.points.length === 1 && <Dot point={geometry.right.points[0]} className='bg-tcg-blue' />}
          {leftHover && <Dot point={leftHover} className='ring-2 ring-white bg-tcg-red' />}
          {rightHover && <Dot point={rightHover} className='ring-2 ring-white bg-tcg-blue' />}
        </div>
      )}

      <StatsTable left={{ label: left.label, stat: leftStat }} right={{ label: right.label, stat: rightStat }} />
    </section>
  );
}

function LegendRow({
  color,
  label,
  hover,
}: {
  color: string;
  label: string;
  hover: { index: number; raw: number } | null;
}) {
  return (
    <span className='flex items-center gap-2 text-muted-foreground'>
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
      <span className='font-semibold text-foreground'>{label}</span>
      {hover && (
        <span className='tabular-nums'>
          {hover.index.toFixed(1)}%
        </span>
      )}
    </span>
  );
}

function Dot({ point, className }: { point: { x: number; y: number }; className: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${className}`}
      style={{ left: `${point.x}%`, top: `${(point.y / 50) * 100}%` }}
      aria-hidden
    />
  );
}

function StatsTable({
  left,
  right,
}: {
  left: { label: string; stat: ReturnType<typeof computeCompareStat> };
  right: { label: string; stat: ReturnType<typeof computeCompareStat> };
}) {
  const rows: Array<{ key: string; label: string; render: (s: typeof left.stat) => string }> = [
    { key: 'current', label: '현재가', render: (s) => money(s.current, s.currency) },
    { key: 'low', label: '기간 최저', render: (s) => money(s.low, s.currency) },
    { key: 'high', label: '기간 최고', render: (s) => money(s.high, s.currency) },
    { key: 'change', label: '기간 변동률', render: (s) => percent(s.changeRate) },
  ];
  return (
    <table className='mt-5 w-full border-collapse text-sm'>
      <thead>
        <tr className='text-muted-foreground'>
          <th className='py-2 text-left font-medium'></th>
          <th className='py-2 text-right font-semibold text-tcg-red'>{left.label}</th>
          <th className='py-2 text-right font-semibold text-tcg-blue'>{right.label}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className='border-t border-muted'>
            <td className='py-2 text-muted-foreground'>{row.label}</td>
            <td className='py-2 text-right font-semibold text-foreground tabular-nums'>{row.render(left.stat)}</td>
            <td className='py-2 text-right font-semibold text-foreground tabular-nums'>{row.render(right.stat)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function money(value: number | null, currency: string | null): string {
  if (value === null || currency === null) return '—';
  return formatPrice(value, currency);
}

function percent(rate: number | null): string {
  if (rate === null) return '—';
  const sign = rate > 0 ? '+' : '';
  return `${sign}${(rate * 100).toFixed(1)}%`;
}

/** Nearest line point to a cursor x-ratio (0..100); null when the line is empty. */
function nearestPoint(line: CompareLine, ratioX: number) {
  if (line.points.length === 0) return null;
  let best = line.points[0];
  let bestDist = Infinity;
  for (const p of line.points) {
    const d = Math.abs(p.x - ratioX);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
