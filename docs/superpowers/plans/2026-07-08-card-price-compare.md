# 두 카드 시세 비교 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 상세에서 진입해 현재 카드(좌)와 검색해 고른 카드(우)의 시세를 지수화(%) 겹친 차트 + 좌우 스탯 표로 비교하는 `/compare` 뷰를 만든다.

**Architecture:** URL이 진실인 RSC 라우트 `/compare?left=<slug>&right=<slug>`. 서버에서 기존 `getCardDetailBySlug`로 좌·우 상세를 받아, 순수 지수화/지오메트리/스탯 로직(`compare-chart.ts`, 테스트 대상)을 클라이언트 `CompareView`가 소비한다. 우측 카드 선택은 기존 `loadPokemonCards` 서버액션을 재사용하는 `CardPicker`가 URL 슬롯을 갱신하는 방식.

**Tech Stack:** Next.js 15 App Router (RSC + server actions), React client components, 손수 그린 SVG 차트(라이브러리 없음), vitest, Tailwind + `@tcground/ui` Button, 테마 토큰 `--tcg-red`(좌)/`--tcg-blue`(우).

## Global Constraints

- 라우트 파라미터 `left`/`right`는 **카드 slug** (상세 라우트 `/cards/[cardId]`도 slug를 씀 — `getCardDetailBySlug`).
- 신규 npm 의존성 금지. 차트는 기존 상세 차트처럼 손수 SVG.
- 커밋 메시지 본문은 불렛포인트 (프로젝트 규칙).
- 좌측 색 = `tcg-red`(`var(--tcg-red)` / `bg-tcg-red`), 우측 색 = `tcg-blue`(`var(--tcg-blue)` / `bg-tcg-blue`).
- 기존 `PriceHistoryChart` / `price-chart.ts`는 **변경 금지** — `filterSeriesByPeriod`, `CHART_PERIODS`, `DEFAULT_CHART_PERIOD`, `ChartPeriod`만 import해서 재사용.
- 차트 지수화: 각 시리즈 첫 유효점(avgPrice>0) = 100, 이후 `avgPrice / base * 100`.
- 스탯 표는 절대가(각자 통화), 차트만 지수화 %.
- 얇은/빈 데이터를 우아하게: 1점이면 점 하나(선 없음), 표가 캐리.

**참고 — 재사용할 기존 심볼 (모두 `@/lib/tcg-catalog`):**
- `getCardDetailBySlug(slug: string): Promise<CatalogCardDetail | null>`
- `getPriceTrendSeries(history: PriceHistory): PricePoint[]` — askingSeries 있으면 그것, 없으면 soldPoints
- `interface PricePoint { date: string; avgPrice: number; minPrice: number; maxPrice: number; sampleCount: number; currency: string; sourceNames: string[]; sourceUrl?; sourceCurrency?; fxRateDate?; fxProvider?; }`
- `interface PriceDisplay { avgPrice: number; minPrice: number; maxPrice: number; changeRate: number; changeTone; lastUpdatedAt: string; stalenessDays: number; sourceLabel: string; currency: string; sampleCount: number; ... }`
- `CatalogCardDetail` 필드(부분): `slug`, `cardName`, `setLabel`, `rarity`, `imageUrl`, `price: PriceDisplay | null`, `priceHistory: PriceHistory`
- `interface PriceHistory { askingSeries: PricePoint[]; soldPoints: PricePoint[]; currency: string | null; gradeLabel: string | null; hasData: boolean; }`
- `interface PokemonCatalogCard { slug; name; setName; rarity; collectorNumber; imageUrl: string | null; price: PriceDisplay | null; ... }`
- `formatPrice(value: number, currency: string): string` (`@/lib/tcg-data`)
- `loadPokemonCards(input): Promise<{ cards: PokemonCatalogCard[]; hasMore; totalCount }>` (`@/app/categories/[categoryId]/_actions/load-cards`) — `input = { query, rarities: [], setSlugs: [], sort: 'name-asc', page: 1 }`
- price-chart 재사용: `CHART_PERIODS`, `DEFAULT_CHART_PERIOD`, `filterSeriesByPeriod(series, period)`, `type ChartPeriod` (`@/app/cards/[cardId]/_lib/price-chart`)

---

### Task 1: 순수 비교 로직 (`compare-chart.ts`)

지수화·겹친 지오메트리·스탯 계산. 유일한 단위 테스트 대상. UI는 이걸 소비만.

**Files:**
- Create: `app/compare/_lib/compare-chart.ts`
- Test: `app/compare/_lib/compare-chart.test.ts`

**Interfaces:**
- Consumes: `PricePoint`, `PriceDisplay` (`@/lib/tcg-catalog`)
- Produces:
  - `indexSeries(series: readonly PricePoint[]): IndexedPoint[]`
  - `buildCompareGeometry(left: readonly PricePoint[], right: readonly PricePoint[]): CompareGeometry`
  - `computeCompareStat(series: readonly PricePoint[], price: PriceDisplay | null): CompareStat`
  - `interface IndexedPoint { date: string; raw: number; index: number }`
  - `interface CompareLine { points: Array<{ x: number; y: number; date: string; raw: number; index: number }>; linePath: string }`
  - `interface CompareGeometry { left: CompareLine; right: CompareLine; indexLow: number; indexHigh: number; hasLine: boolean }`
  - `interface CompareStat { current: number | null; low: number | null; high: number | null; changeRate: number | null; currency: string | null }`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/compare/_lib/compare-chart.test.ts`
Expected: FAIL — `Failed to resolve import "./compare-chart"` / functions not defined.

- [ ] **Step 3: Write minimal implementation**

```typescript
// app/compare/_lib/compare-chart.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/compare/_lib/compare-chart.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add app/compare/_lib/compare-chart.ts app/compare/_lib/compare-chart.test.ts
git commit -m "feat: 카드 비교 지수화·지오메트리·스탯 순수 로직 추가

- indexSeries: 첫 유효점 100 기준 지수화
- buildCompareGeometry: 두 시리즈 공통 시간축·지수축 매핑
- computeCompareStat: 절대가 현재/최저/최고/변동률"
```

---

### Task 2: 비교 뷰 컴포넌트 (`CompareView`)

기간 탭 + 겹친 SVG(좌 red / 우 blue) + 좌우 스탯 표 + hover 양쪽 값 readout. 순수 로직은 Task 1에서 다 옴 — 이 컴포넌트는 상태(기간·hover)와 그리기만.

> **참고:** 스펙의 `CompareChart` + `CompareStatsTable` 두 컴포넌트를 하나(`CompareView`)로 합쳤다. 둘은 같은 `period` 상태를 공유하므로 분리하면 prop-drilling + 중복 필터링만 늘어난다. 순수 로직이 이미 분리(Task 1)돼 있어 테스트성은 유지된다.

**Files:**
- Create: `app/compare/_components/CompareView.tsx`

**Interfaces:**
- Consumes: `buildCompareGeometry`, `computeCompareStat` (Task 1); `CHART_PERIODS`, `DEFAULT_CHART_PERIOD`, `filterSeriesByPeriod`, `ChartPeriod` (`@/app/cards/[cardId]/_lib/price-chart`); `formatPrice` (`@/lib/tcg-data`); `PricePoint`, `PriceDisplay` (`@/lib/tcg-catalog`)
- Produces:
  - `interface CompareSide { label: string; series: PricePoint[]; price: PriceDisplay | null }`
  - `function CompareView({ left, right }: { left: CompareSide; right: CompareSide }): JSX.Element`

- [ ] **Step 1: Write the component**

```tsx
// app/compare/_components/CompareView.tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors from `app/compare/_components/CompareView.tsx`). If `size='tab'` or `variant` types complain, confirm against `app/cards/[cardId]/_components/PriceHistoryChart.tsx` which uses the same props — copy exactly.

- [ ] **Step 3: Commit**

```bash
git add app/compare/_components/CompareView.tsx
git commit -m "feat: 카드 비교 뷰 컴포넌트 추가

- 기간 탭 + 좌(red)/우(blue) 지수화 겹친 SVG 라인
- hover 시 양쪽 지수 readout, 1점이면 점만
- 절대가 좌우 스탯 표(현재/최저/최고/변동률)"
```

---

### Task 3: 카드 검색 픽커 (`CardPicker`)

우측(또는 좌측) 슬롯을 채우는 검색 픽커. 기존 `loadPokemonCards` 서버액션 재사용, 결과 클릭 시 URL 슬롯 갱신. 디바운스 없이 **제출(Enter/버튼)** 로 검색 — 의존성·복잡도 절약.

**Files:**
- Create: `app/compare/_components/CardPicker.tsx`

**Interfaces:**
- Consumes: `loadPokemonCards` (`@/app/categories/[categoryId]/_actions/load-cards`); `PokemonCatalogCard` (`@/lib/tcg-catalog`); `useRouter`, `useSearchParams` (`next/navigation`)
- Produces: `function CardPicker({ slot }: { slot: 'left' | 'right' }): JSX.Element`

- [ ] **Step 1: Write the component**

```tsx
// app/compare/_components/CardPicker.tsx
'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@tcground/ui';
import { loadPokemonCards } from '@/app/categories/[categoryId]/_actions/load-cards';
import type { PokemonCatalogCard } from '@/lib/tcg-catalog';

interface CardPickerProps {
  slot: 'left' | 'right';
}

export function CardPicker({ slot }: CardPickerProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PokemonCatalogCard[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 1) return;
    startTransition(async () => {
      const res = await loadPokemonCards({ query: q, rarities: [], setSlugs: [], sort: 'name-asc', page: 1 });
      setResults(res.cards);
      setSearched(true);
    });
  }

  function pick(slug: string) {
    const next = new URLSearchParams(params.toString());
    next.set(slot, slug);
    router.replace(`/compare?${next.toString()}`);
  }

  return (
    <div className='flex h-full flex-col rounded-2xl border border-dashed border-muted bg-card p-5'>
      <p className='mb-3 text-sm font-semibold text-foreground'>
        {slot === 'left' ? '왼쪽' : '오른쪽'} 카드 선택
      </p>
      <form onSubmit={handleSearch} className='flex gap-2'>
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='카드 이름 검색'
          className='min-w-0 flex-1 rounded-lg border border-muted bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-tcg-red'
          aria-label='카드 이름 검색'
        />
        <Button type='submit' variant='outline' disabled={isPending}>
          {isPending ? '검색 중…' : '검색'}
        </Button>
      </form>

      <ul className='mt-4 flex-1 space-y-2 overflow-y-auto'>
        {results.map((card) => (
          <li key={card.slug}>
            <button
              type='button'
              onClick={() => pick(card.slug)}
              className='flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted'
            >
              {card.imageUrl ? (
                <Image src={card.imageUrl} alt='' width={36} height={50} className='rounded' />
              ) : (
                <span className='h-[50px] w-9 rounded bg-muted' aria-hidden />
              )}
              <span className='min-w-0'>
                <span className='block truncate text-sm font-medium text-foreground'>{card.name}</span>
                <span className='block truncate text-xs text-muted-foreground'>{card.setName}</span>
              </span>
            </button>
          </li>
        ))}
        {searched && !isPending && results.length === 0 && (
          <li className='py-6 text-center text-sm text-muted-foreground'>검색 결과가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. Confirm `loadPokemonCards` input type matches (`{ query, rarities, setSlugs, sort, page }`, `sort: 'name-asc'` is a valid `PokemonSort`).

- [ ] **Step 3: Commit**

```bash
git add app/compare/_components/CardPicker.tsx
git commit -m "feat: 카드 비교 검색 픽커 추가

- 기존 loadPokemonCards 재사용해 이름 검색
- 결과 클릭 시 URL의 left/right 슬롯 갱신(router.replace)
- 제출식 검색(디바운스 없음)"
```

---

### Task 4: 비교 페이지 라우트 (`/compare`)

searchParams(left/right) 읽어 좌·우 상세 fetch, 카드 헤더 + `CompareView` / `CardPicker` 배치. 엣지: 없음/하나만/동일/미존재.

**Files:**
- Create: `app/compare/page.tsx`

**Interfaces:**
- Consumes: `getCardDetailBySlug`, `getPriceTrendSeries`, `CatalogCardDetail` (`@/lib/tcg-catalog`); `CompareView`, `CompareSide` (Task 2); `CardPicker` (Task 3); `PublicHeader` (`@/components/tcg/layout/PublicHeader`), `PageFooter` (`@/components/tcg/layout/PageFooter`)
- Produces: `default async function ComparePage({ searchParams }): Promise<JSX.Element>`

- [ ] **Step 1: Write the page**

```tsx
// app/compare/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PublicHeader } from '@/components/tcg/layout/PublicHeader';
import { PageFooter } from '@/components/tcg/layout/PageFooter';
import {
  getCardDetailBySlug,
  getPriceTrendSeries,
  type CatalogCardDetail,
} from '@/lib/tcg-catalog';
import { CompareView, type CompareSide } from './_components/CompareView';
import { CardPicker } from './_components/CardPicker';

export const metadata: Metadata = {
  title: 'TCGround | 카드 시세 비교',
  description: '두 카드의 시세 변동을 지수화 차트와 표로 나란히 비교하세요.',
};

interface ComparePageProps {
  searchParams: Promise<{ left?: string | string[]; right?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toSide(card: CatalogCardDetail): CompareSide {
  return {
    label: card.cardName,
    series: getPriceTrendSeries(card.priceHistory),
    price: card.price,
  };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { left: rawLeft, right: rawRight } = await searchParams;
  const leftSlug = first(rawLeft);
  const rightSlug = first(rawRight);

  const [leftCard, rightCard] = await Promise.all([
    leftSlug ? getCardDetailBySlug(leftSlug) : Promise.resolve(null),
    rightSlug ? getCardDetailBySlug(rightSlug) : Promise.resolve(null),
  ]);

  const sameCard = Boolean(leftCard && rightCard && leftCard.slug === rightCard.slug);

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <PublicHeader />
      <main className='mx-auto w-full max-w-5xl flex-1 px-4 py-8'>
        <Link href='/' className='mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
          <ArrowLeft className='size-4' aria-hidden />
          돌아가기
        </Link>
        <h1 className='mb-6 text-3xl font-bold text-foreground'>카드 시세 비교</h1>

        <div className='grid gap-4 md:grid-cols-2'>
          <CardColumn card={leftCard} slot='left' />
          <CardColumn card={rightCard} slot='right' />
        </div>

        {sameCard && (
          <p className='mt-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground'>
            같은 카드입니다. 오른쪽에 다른 카드를 선택해 비교하세요.
          </p>
        )}

        {leftCard && rightCard && !sameCard && (
          <CompareView left={toSide(leftCard)} right={toSide(rightCard)} />
        )}

        {(!leftCard || !rightCard) && !sameCard && (
          <p className='mt-6 text-sm text-muted-foreground'>
            두 카드를 모두 선택하면 시세 비교가 표시됩니다.
          </p>
        )}
      </main>
      <PageFooter />
    </div>
  );
}

function CardColumn({ card, slot }: { card: CatalogCardDetail | null; slot: 'left' | 'right' }) {
  if (!card) {
    // useSearchParams inside CardPicker needs a Suspense boundary during SSR.
    return (
      <Suspense fallback={<div className='h-40 rounded-2xl bg-card' />}>
        <CardPicker slot={slot} />
      </Suspense>
    );
  }
  const accent = slot === 'left' ? 'text-tcg-red' : 'text-tcg-blue';
  return (
    <div className='flex items-center gap-4 rounded-2xl bg-card p-5'>
      {card.imageUrl ? (
        <Image src={card.imageUrl} alt={card.cardName} width={72} height={100} className='rounded-lg' />
      ) : (
        <span className='h-[100px] w-[72px] rounded-lg bg-muted' aria-hidden />
      )}
      <div className='min-w-0'>
        <p className={`text-xs font-semibold ${accent}`}>{slot === 'left' ? '왼쪽' : '오른쪽'}</p>
        <p className='truncate text-lg font-bold text-foreground'>{card.cardName}</p>
        <p className='truncate text-sm text-muted-foreground'>{card.setLabel}</p>
        <Link href={`/compare?${slot === 'left' ? 'right' : 'left'}=${card.slug}`} className='mt-1 inline-block text-xs text-muted-foreground underline hover:text-foreground'>
          이 카드 바꾸기
        </Link>
      </div>
    </div>
  );
}
```

> **Note — "바꾸기" 링크:** 카드가 채워진 슬롯을 바로 다시 픽커로 만드는 대신, 반대 슬롯 기준 새 비교로 리셋하는 가벼운 링크로 처리(YAGNI). 인라인 재검색은 후속.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual verification — run the app**

Run: `npm run dev`, 브라우저에서 확인:
- `/compare` → 좌·우 둘 다 픽커
- `/compare?left=<존재하는 slug>` → 좌 카드 헤더 + 우 픽커 + "두 카드를 모두 선택하면…" 문구
- 우 픽커에서 검색·선택 → URL에 `right=` 붙고 `CompareView` 등장 (기간 탭·표 동작)
- `/compare?left=X&right=X` (같은 slug) → "같은 카드입니다" 문구
- `/compare?left=없는슬러그` → 좌 픽커로 표시(카드 null)

유효한 slug 하나 확보:
Run: `docker exec -i supabase_db_tcg-round psql -U postgres -t -c "select slug from public.cards where slug is not null limit 3;"`

- [ ] **Step 4: Commit**

```bash
git add app/compare/page.tsx
git commit -m "feat: /compare 카드 시세 비교 페이지 추가

- searchParams(left/right) slug로 좌우 상세 fetch
- 채워진 슬롯은 카드 헤더, 빈 슬롯은 검색 픽커
- 둘 다 있으면 CompareView, 동일 카드는 안내 문구"
```

---

### Task 5: 카드 상세에 "비교" 진입 버튼

상세 액션 버튼 행에 `/compare?left=<slug>` 링크 추가.

**Files:**
- Modify: `app/cards/[cardId]/page.tsx:293-299` (액션 버튼 행)

**Interfaces:**
- Consumes: `card.slug` (이미 로드됨), `Link` (`next/link`, 이미 import됨), `Button` (`@tcground/ui`, 이미 import됨)
- Produces: (없음 — 진입점만)

- [ ] **Step 1: Add the compare button**

`app/cards/[cardId]/page.tsx`의 이 블록:

```tsx
          <div className='mt-2 flex flex-wrap gap-4'>
            <Button type='button' size='cta' className='hover:scale-[1.02]'>
              <CirclePlus className='size-5' aria-hidden />
              관심 카드 추가
            </Button>
            {card.price ? alertSlot : null}
          </div>
```

를 아래로 교체 (`비교` 버튼 추가):

```tsx
          <div className='mt-2 flex flex-wrap gap-4'>
            <Button type='button' size='cta' className='hover:scale-[1.02]'>
              <CirclePlus className='size-5' aria-hidden />
              관심 카드 추가
            </Button>
            <Button asChild variant='outline' size='cta'>
              <Link href={`/compare?left=${card.slug}`}>다른 카드와 비교</Link>
            </Button>
            {card.price ? alertSlot : null}
          </div>
```

> **Note — `asChild`:** `@tcground/ui` Button이 shadcn 기반이라 `asChild`로 `Link`를 감싼다(Popover/Dialog에서 `asChild` 사용 확인됨). 만약 Button이 `asChild`를 지원 안 하면 대신 `<Link href={...} className='...'>`에 버튼 클래스를 직접 주는 방식으로 폴백.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. `asChild` 타입 에러 나면 위 폴백(Link + 클래스)으로 교체.

- [ ] **Step 3: Manual verification**

`npm run dev` → 아무 카드 상세 페이지 → "다른 카드와 비교" 클릭 → `/compare?left=<그 카드 slug>` 로 이동, 좌측에 그 카드가 채워져 있어야 함.

- [ ] **Step 4: Commit**

```bash
git add app/cards/[cardId]/page.tsx
git commit -m "feat: 카드 상세에 '다른 카드와 비교' 진입 버튼 추가

- /compare?left=<slug>로 이동, 좌측에 현재 카드 프리필"
```

---

## Self-Review

**Spec coverage:**
- 진입(상세 버튼 → `/compare?left`) → Task 5 ✅
- 우측 카드 검색 선택 → Task 3 ✅
- 겹친 차트 + 스탯 표 → Task 2 ✅
- 지수화(시작=100) → Task 1 `indexSeries` + Task 2 렌더 ✅
- 전용 뷰 `/compare?left&right`, URL 기반 → Task 4 ✅
- `price-chart.ts` 지오메트리 재사용, 기존 차트 미변경 → Task 2 import만 ✅
- 얇은/빈 데이터, 동일 카드, 미존재 slug, 통화 상이 → Task 1(1점/빈) + Task 4(동일/미존재) + 표는 각자 통화 ✅
- 범위 밖(최근 본 카드, 3개+ 비교) → 미포함 ✅

**Placeholder scan:** 없음 — 모든 스텝에 실제 코드/명령/예상 출력.

**Type consistency:** `CompareSide`(Task 2 정의) → Task 4에서 소비 일치. `computeCompareStat`/`buildCompareGeometry`/`indexSeries` 시그니처 Task 1 정의 = Task 2 사용 일치. `loadPokemonCards` 입력 형태 = 기존 `LoadPokemonCardsInput` 일치. `getCardDetailBySlug`/`getPriceTrendSeries` 실제 시그니처 확인됨.

**Note — 스펙 대비 구조 변경 1건:** 스펙의 별도 `search-cards` 서버액션은 기존 `loadPokemonCards`가 동일 기능(이름 `ilike` + 경량 카드 반환)을 이미 제공하므로 신설하지 않고 재사용. 스펙의 `CompareChart`+`CompareStatsTable`은 공유 period 상태 때문에 `CompareView` 하나로 통합. 순수 로직은 `compare-chart.ts`로 분리돼 테스트성 유지.
