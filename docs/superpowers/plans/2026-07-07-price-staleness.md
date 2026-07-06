# 가격 신선도 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 판매중 호가가 없는 날에도 이월된 거래가를 보여주되, 그 값이 며칠 전 것인지 사용자에게 명시한다.

**Architecture:** DB는 변경하지 않는다. 읽기 함수 `derivePriceDisplayFromHistory`가 이미 추세 series의 마지막 실측점을 요약가로 이월하고 있으므로, 여기에 `stalenessDays`(경과 일수) 필드를 더한다. 상세 페이지는 이 값으로 신선도 배지를, 차트는 마지막 실측점→오늘 점선 연장을 렌더한다.

**Tech Stack:** Next.js (App Router), TypeScript, Vitest, Tailwind (웜톤 테마 토큰).

## Global Constraints

- raw hex 색상 금지 — 웜톤 테마 토큰/기존 클래스(`bg-muted`, `text-muted-foreground`, `--tcg-red` 등) 사용.
- 신선도 경고 임계값: **7일**. 즉 `stalenessDays <= 7`은 정상/중립, `>= 8`은 경고.
- 날짜 차이는 UTC 자정 기준 일수. 기존 `toSnapshotDate(iso)` (`YYYY-MM-DD` 반환) 재사용.
- `derivePriceDisplayFromHistory`는 순수 함수 유지 — "오늘"은 인자로 주입, 기본값 `new Date()`.
- 커밋 메시지 본문은 불렛포인트.

---

### Task 1: `PriceDisplay.stalenessDays` 필드

**Files:**
- Modify: `lib/tcg-catalog.ts` (`PriceDisplay` 인터페이스 ~116행, `derivePriceDisplayFromHistory` ~1605행)
- Test: `lib/tcg-catalog.test.ts`

**Interfaces:**
- Consumes: 없음 (기존 `PriceHistory`, `getPriceTrendSeries`, `toSnapshotDate` 사용).
- Produces:
  - `PriceDisplay`에 `stalenessDays: number` 필드 추가.
  - `derivePriceDisplayFromHistory(history: PriceHistory, today?: Date): PriceDisplay | null` — 기존 시그니처에 optional `today` 파라미터(기본 `new Date()`) 추가. `stalenessDays` = `latest.date`와 `today`의 UTC 자정 기준 일수 차. 같은 날 = 0.

- [ ] **Step 1: 실패 테스트 작성**

`lib/tcg-catalog.test.ts`의 `derivePriceDisplayFromHistory` describe 블록 근처(파일 내 기존 `snapshotRow`/`buildPriceHistory` 헬퍼 사용)에 추가:

```ts
it('reports zero staleness when the latest snapshot is today', () => {
  const history = buildPriceHistory([
    snapshotRow({ snapshot_date: '2026-05-29', avg_price: 110 }),
  ]);
  const price = derivePriceDisplayFromHistory(history, new Date('2026-05-29T09:00:00Z'));
  expect(price?.stalenessDays).toBe(0);
});

it('counts days since the latest snapshot for a stale price', () => {
  const history = buildPriceHistory([
    snapshotRow({ snapshot_date: '2026-05-21', avg_price: 110 }),
  ]);
  const price = derivePriceDisplayFromHistory(history, new Date('2026-05-29T09:00:00Z'));
  expect(price?.stalenessDays).toBe(8);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run lib/tcg-catalog.test.ts -t staleness`
Expected: FAIL — `stalenessDays`가 `undefined` (필드 없음).

- [ ] **Step 3: 최소 구현**

`lib/tcg-catalog.ts` — `PriceDisplay` 인터페이스에 필드 추가 (`lastUpdatedAt` 아래):

```ts
  lastUpdatedAt: string;
  /** 마지막 실측 스냅샷 이후 경과 일수. 0 = 오늘 데이터. */
  stalenessDays: number;
```

같은 파일에 순수 헬퍼 추가 (`derivePriceDisplayFromHistory` 위):

```ts
/** `snapshotDate`(YYYY-MM-DD)와 `today`의 UTC 자정 기준 경과 일수. 음수는 0으로 클램프. */
function stalenessDaysSince(snapshotDate: string, today: Date): number {
  const snapshotMs = Date.parse(`${snapshotDate}T00:00:00Z`);
  const todayMs = Date.parse(`${toSnapshotDate(today.toISOString())}T00:00:00Z`);
  if (Number.isNaN(snapshotMs) || Number.isNaN(todayMs)) return 0;
  return Math.max(0, Math.round((todayMs - snapshotMs) / (24 * 60 * 60 * 1000)));
}
```

`derivePriceDisplayFromHistory` 시그니처와 반환 객체 수정:

```ts
export function derivePriceDisplayFromHistory(
  history: PriceHistory,
  today: Date = new Date(),
): PriceDisplay | null {
```

반환 객체(`return { avgPrice: latest.avgPrice, ... }`)에 필드 추가:

```ts
    lastUpdatedAt: formatSnapshotDate(latest.date),
    stalenessDays: stalenessDaysSince(latest.date, today),
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run lib/tcg-catalog.test.ts -t staleness`
Expected: PASS (2 passed).

- [ ] **Step 5: 전체 catalog 테스트로 회귀 없음 확인**

Run: `pnpm vitest run lib/tcg-catalog.test.ts`
Expected: PASS — 기존 테스트 전부 통과 (신규 필드는 옵셔널 주입이라 기존 호출부 영향 없음).

- [ ] **Step 6: 커밋**

```bash
git add lib/tcg-catalog.ts lib/tcg-catalog.test.ts
git commit -m "feat: PriceDisplay.stalenessDays 추가

- 마지막 실측 스냅샷 이후 경과 일수 계산
- derivePriceDisplayFromHistory에 today 주입 파라미터 추가"
```

---

### Task 2: 상세 페이지 신선도 배지

**Files:**
- Modify: `app/cards/[cardId]/page.tsx` (요약가 블록 ~256-268행)
- Test: `app/cards/[cardId]/page.test.tsx` (기존 `lastUpdatedAt` 고정값에 `stalenessDays` 추가 필요)

**Interfaces:**
- Consumes: `card.price.stalenessDays` (Task 1 산출).
- Produces: UI만. 새 export 없음.

- [ ] **Step 1: 기존 fixture에 필드 추가**

`app/cards/[cardId]/page.test.tsx`의 `createCardDetail()` 내 `price` 객체(`lastUpdatedAt: '2026년 5월 22일'`, ~227행)에 `stalenessDays: 0` 추가. 안 하면 `CatalogCardDetail` 타입 불충족으로 컴파일 실패.

```ts
      lastUpdatedAt: '2026년 5월 22일',
      stalenessDays: 0,
```

- [ ] **Step 2: 배지 문구 검증 테스트 작성**

같은 파일에 테스트 추가. 이 파일은 `render(<CardDetailContent card={createCardDetail()} />)` 패턴을 쓰고 오버라이드 헬퍼가 없으므로, fixture를 만든 뒤 `price`만 펼쳐서 교체한다:

```ts
it('shows a stale-price warning badge when the price is over 7 days old', () => {
  const base = createCardDetail();
  render(<CardDetailContent card={{ ...base, price: { ...base.price, stalenessDays: 8 } }} />);
  expect(screen.getByText(/최근 거래 없음/)).toBeTruthy();
});

it('shows a neutral staleness badge within 7 days', () => {
  const base = createCardDetail();
  render(<CardDetailContent card={{ ...base, price: { ...base.price, stalenessDays: 3 } }} />);
  expect(screen.getByText('3일 전 기준')).toBeTruthy();
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pnpm vitest run "app/cards/[cardId]/page.test.tsx"`
Expected: 신규 두 테스트 FAIL — "최근 거래 없음" / "3일 전 기준" 텍스트 없음. (기존 테스트는 통과.)

- [ ] **Step 4: 배지 구현**

`app/cards/[cardId]/page.tsx` — 요약가 변동률 칩(`<TrendIcon .../>` 있는 span) 바로 뒤, 같은 `flex flex-wrap items-baseline gap-3` div 안에 배지 추가:

```tsx
                  <TrendIcon tone={card.price.changeTone} />
                  {formatChangeRate(card.price.changeRate)}
                </span>
                {card.price.stalenessDays > 0 && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm leading-none font-semibold ${
                      card.price.stalenessDays > 7
                        ? 'bg-tcg-red/10 text-tcg-red'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {card.price.stalenessDays > 7
                      ? `최근 거래 없음 · ${card.price.stalenessDays}일 전 호가`
                      : `${card.price.stalenessDays}일 전 기준`}
                  </span>
                )}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run "app/cards/[cardId]/page.test.tsx"`
Expected: PASS — 신규 테스트 + 기존 테스트 전부 통과.

- [ ] **Step 6: 커밋**

```bash
git add "app/cards/[cardId]/page.tsx" "app/cards/[cardId]/page.test.tsx"
git commit -m "feat: 상세 페이지 가격 신선도 배지

- 이월 값은 'N일 전 기준' 중립 배지
- 7일 초과 시 '최근 거래 없음' 경고 배지"
```

---

### Task 3: 차트 마지막 실측점→오늘 점선 이월 구간

**Files:**
- Modify: `app/cards/[cardId]/_lib/price-chart.ts` (`ChartGeometry` ~41행, `buildChartGeometry` ~61행)
- Modify: `app/cards/[cardId]/_components/PriceHistoryChart.tsx` (geometry 호출 ~46행, SVG 렌더 ~138행)
- Test: `app/cards/[cardId]/_lib/price-chart.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 geometry).
- Produces:
  - `ChartGeometry`에 `carryForwardPath: string` 필드 추가 (이월 구간 없으면 `''`).
  - `buildChartGeometry(series, overlay, options?: { today?: Date }): ChartGeometry` — 기존 두 인자 뒤에 optional `options`. `options.today`가 series 마지막 날짜보다 미래면 x축 최댓값을 `today`로 확장하고, 마지막 실측점에서 오늘 지점까지 수평 `carryForwardPath`를 만든다.

- [ ] **Step 1: 실패 테스트 작성**

`app/cards/[cardId]/_lib/price-chart.test.ts`에 추가 (파일 상단의 `point()` 헬퍼 재사용, import에 `buildChartGeometry` 추가):

```ts
import { buildChartGeometry, filterSeriesByPeriod } from './price-chart';

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
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run "app/cards/[cardId]/_lib/price-chart.test.ts" -t carry-forward`
Expected: FAIL — `carryForwardPath`가 `undefined` (필드 없음).

- [ ] **Step 3: geometry 구현**

`app/cards/[cardId]/_lib/price-chart.ts` — `ChartGeometry`에 필드 추가:

```ts
export interface ChartGeometry {
  linePath: string;
  areaPath: string;
  /** 마지막 실측점→오늘 수평 이월 구간(점선용). 이월 없으면 ''. */
  carryForwardPath: string;
  linePoints: Array<{ x: number; y: number }>;
  overlayPoints: Array<{ x: number; y: number }>;
  hasData: boolean;
}
```

`buildChartGeometry` 시그니처와 x축 최댓값 계산 수정. 시그니처:

```ts
export function buildChartGeometry(
  series: readonly PricePoint[],
  overlay: readonly PricePoint[],
  options: { today?: Date } = {},
): ChartGeometry {
```

이른 반환의 빈 geometry에도 필드 추가:

```ts
  if (scaleBasis.length === 0) {
    return { linePath: '', areaPath: '', carryForwardPath: '', linePoints: [], overlayPoints: [], hasData: false };
  }
```

`maxTime` 계산 뒤에 오늘로 확장한 유효 최댓값 도입 (`const maxTime = Math.max(...times);` 다음 줄):

```ts
  const todayTime = options.today?.getTime();
  const effectiveMaxTime =
    todayTime !== undefined && todayTime > maxTime ? todayTime : maxTime;
```

`xOf`가 `maxTime` 대신 `effectiveMaxTime`을 쓰도록 변경:

```ts
  const xOf = (date: string) =>
    effectiveMaxTime === minTime
      ? 50
      : ((new Date(date).getTime() - minTime) / (effectiveMaxTime - minTime)) * 100;
```

overlay 윈도우 필터의 상한도 `effectiveMaxTime`으로 (미래 확장 시 누락 방지):

```ts
      return time >= minTime && time <= effectiveMaxTime;
```

`return` 직전에 carry-forward 경로 계산 후 반환에 포함:

```ts
  const carryForwardPath =
    effectiveMaxTime > maxTime && linePoints.length > 0
      ? `M${linePoints[linePoints.length - 1].x.toFixed(2)},${linePoints[
          linePoints.length - 1
        ].y.toFixed(2)} L100.00,${linePoints[linePoints.length - 1].y.toFixed(2)}`
      : '';

  return { linePath, areaPath, carryForwardPath, linePoints, overlayPoints, hasData: true };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run "app/cards/[cardId]/_lib/price-chart.test.ts"`
Expected: PASS — carry-forward 3건 + 기존 `filterSeriesByPeriod` 테스트 통과.

- [ ] **Step 5: 차트 컴포넌트에서 today 주입 + 점선 렌더**

`app/cards/[cardId]/_components/PriceHistoryChart.tsx` — geometry useMemo에 `today` 전달:

```ts
  const geometry = useMemo(
    () => buildChartGeometry(filteredSeries, overlaySold, { today: new Date() }),
    [filteredSeries, overlaySold],
  );
```

SVG 안, `linePath` 실선 `<path>` 바로 뒤에 이월 점선 추가:

```tsx
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
```

- [ ] **Step 6: 타입체크 + 관련 테스트 회귀 확인**

Run: `pnpm vitest run "app/cards/[cardId]/_lib/price-chart.test.ts" "app/cards/[cardId]/page.test.tsx"`
Expected: PASS.

Run: `pnpm tsc --noEmit`
Expected: 에러 없음 (`ChartGeometry` 소비처가 새 필드로 깨지지 않는지 확인).

- [ ] **Step 7: 커밋**

```bash
git add "app/cards/[cardId]/_lib/price-chart.ts" "app/cards/[cardId]/_lib/price-chart.test.ts" "app/cards/[cardId]/_components/PriceHistoryChart.tsx"
git commit -m "feat: 차트 마지막 실측점→오늘 점선 이월 구간

- buildChartGeometry에 today 주입 시 x축을 오늘까지 확장
- 이월 구간은 점선으로 실측 구간과 시각 구분"
```

---

## Self-Review 결과

- **Spec 커버리지**: (1) `stalenessDays` 필드 → Task 1. (2) 요약가 배지 임계 7일 → Task 2. (3) 차트 점선 이월 → Task 3. 스펙 범위 밖(DB 이월 행, 알림 게이팅, 비정규화 컬럼)은 계획에서 제외됨 — 일치.
- **Placeholder**: 없음. 모든 코드 스텝에 실제 코드 포함. Task 2 Step 2는 테스트 파일의 렌더 헬퍼 이름을 실행 시 확인하라고 명시 — 파일별 관례 차이 때문이며, 확인 절차를 구체적으로 지시함.
- **타입 일관성**: `stalenessDays: number`, `carryForwardPath: string`, `derivePriceDisplayFromHistory(history, today)`, `buildChartGeometry(series, overlay, options)` — Task 간 시그니처 일치.
