# 가격 알림 (Price Alerts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 유저가 카드 판본별 목표가(하회/상회)를 설정하면, 일일 시세 배치가 조건 충족을 감지해 이메일 + 인앱으로 1회 알림 후 비활성화한다.

**Architecture:** 시세는 `pnpm collect:daily`(로컬 launchd, kream 스크립트)로만 갱신되므로 평가를 그 배치 끝단에 붙인다. 카드 시세는 스냅샷 1행이 아닌 파생 블렌드값이라, 배치는 카드 상세와 **동일한 export 함수**(`buildPriceHistory` → `derivePriceDisplayFromHistory`)를 판본별로 재호출해 `avgPrice`를 임계값과 비교한다. 알림/인앱 데이터는 RLS 보호 테이블 2개(`price_alerts`, `notifications`)에 저장하고, 배치는 service_role(admin 클라이언트)로 접근한다.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS), `@supabase/supabase-js`, `@tcground/ui`(shadcn 기반), Resend(이메일), vitest.

## Global Constraints

- 스펙 원본: `memory-bank/prd/price-alerts.md` (충돌 시 스펙 우선)
- 커밋 메시지 본문은 **불렛포인트**로 작성 (한국어 subject 허용, 기존 히스토리 관례)
- 마이그레이션 파일명: `supabase/migrations/YYYYMMDDNNNN_<name>.sql` (예: `202607060001_...`)
- RLS 정책 패턴: `using ((select auth.uid()) = user_id)` (기존 `favorite_cards` 관례 그대로)
- service_role 쓰기 테이블은 별도 `grant` 필요 (RLS deny-all + 명시 grant)
- Server Action은 `'use server'`, 인증은 `supabase.auth.getClaims()` → `data?.claims?.sub`
- admin 클라이언트(`lib/supabase/admin.ts`)는 절대 클라이언트 컴포넌트에서 import 금지
- 배치 평가 실패가 시세 수집 성공을 롤백하면 안 됨 → 독립 try/catch, 로깅만
- 이메일 실패 ≠ 알림 실패 (인앱 `notifications` 행이 원장)
- 신규 env: `RESEND_API_KEY`, `PRICE_ALERT_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`
- 테스트 러너: `pnpm vitest run <path>` (기존 `lib/pricing/*.test.ts` 패턴)

---

## File Structure

**신규:**
- `supabase/migrations/202607060001_create_price_alerts.sql` — 테이블 2개 + RLS + grant
- `lib/alerts/evaluate.ts` — 판정 순수함수 + 평가 파이프라인 (배치가 호출)
- `lib/alerts/evaluate.test.ts` — 판정/파이프라인 테스트
- `lib/alerts/email.ts` — Resend 발송 래퍼
- `lib/alerts/types.ts` — 공유 타입 (`ActiveAlert`, `AlertHit`, `AlertDirection`)
- `app/cards/[cardId]/_actions/price-alert.ts` — 생성/해제 Server Action
- `app/cards/[cardId]/_actions/price-alert.test.ts` — 액션 입력검증 테스트
- `app/cards/[cardId]/_components/PriceAlertButton.tsx` — 버튼 + 다이얼로그 (클라이언트)
- `components/tcg/layout/NotificationBell.tsx` — 헤더 벨 + 안읽음 배지 + 드롭다운
- `app/notifications/_actions/mark-read.ts` — 안읽음 → 읽음 Server Action

**수정:**
- `lib/tcg-catalog.ts` — `fetchSnapshotRowsForPrintings` export (배치 재사용)
- `scripts/collect-kream-search-page.ts` — `upsertSnapshots` 직후 평가 훅
- `app/cards/[cardId]/page.tsx` — 정적 버튼 → `PriceAlertButton` 교체, 활성알림 조회
- `components/tcg/layout/PublicHeader.tsx` — 벨 슬롯 추가
- `.env.example` — 신규 env 3개
- `package.json` — `resend` 의존성

---

## Task 1: DB 마이그레이션 — price_alerts / notifications

**Files:**
- Create: `supabase/migrations/202607060001_create_price_alerts.sql`

**Interfaces:**
- Produces: 테이블 `public.price_alerts`, `public.notifications` (아래 컬럼 스키마). 이후 모든 태스크가 이 컬럼명을 참조.

- [ ] **Step 1: 마이그레이션 작성**

`supabase/migrations/202607060001_create_price_alerts.sql`:

```sql
-- Price alerts: per-printing target price watches, evaluated by the daily
-- collection batch. Notifications: in-app ledger (also the record that an
-- email was attempted).

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_printing_id uuid not null references public.card_printings(id) on delete cascade,
  currency text not null,
  grade_label text,
  direction text not null check (direction in ('below', 'above')),
  threshold numeric(14, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  fired_at timestamptz
);

-- One active alert per (user, printing, direction). Re-arming replaces it.
create unique index if not exists price_alerts_active_unique_idx
  on public.price_alerts (user_id, card_printing_id, direction)
  where is_active;
create index if not exists price_alerts_active_scan_idx
  on public.price_alerts (card_printing_id)
  where is_active;
create index if not exists price_alerts_user_idx
  on public.price_alerts (user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid references public.price_alerts(id) on delete set null,
  title text not null,
  body text not null,
  card_printing_id uuid references public.card_printings(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at);

alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "price alerts readable by owner" on public.price_alerts;
create policy "price alerts readable by owner"
  on public.price_alerts for select
  using ((select auth.uid()) = user_id);

drop policy if exists "price alerts insertable by owner" on public.price_alerts;
create policy "price alerts insertable by owner"
  on public.price_alerts for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "price alerts updatable by owner" on public.price_alerts;
create policy "price alerts updatable by owner"
  on public.price_alerts for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "price alerts deletable by owner" on public.price_alerts;
create policy "price alerts deletable by owner"
  on public.price_alerts for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications readable by owner" on public.notifications;
create policy "notifications readable by owner"
  on public.notifications for select
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications updatable by owner" on public.notifications;
create policy "notifications updatable by owner"
  on public.notifications for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.price_alerts to authenticated;
grant select, update on public.notifications to authenticated;

-- Batch (service_role) evaluates alerts and writes notifications.
grant select, update on public.price_alerts to service_role;
grant insert on public.notifications to service_role;
```

- [ ] **Step 2: 로컬 DB에 적용**

Run: `supabase migration up` (또는 프로젝트의 로컬 적용 방식 — `supabase/migrations`가 있으므로 supabase CLI 사용)
Expected: 에러 없이 두 테이블 생성. `supabase db reset`으로도 확인 가능.

- [ ] **Step 3: 적용 검증**

Run: `psql "$LOCAL_DB_URL" -c "\d public.price_alerts" -c "\d public.notifications"`
Expected: 컬럼/인덱스/RLS enabled 확인.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202607060001_create_price_alerts.sql
git commit -m "feat: 가격 알림 테이블(price_alerts/notifications) 마이그레이션

- price_alerts: 판본·방향당 활성 알림 1개(부분 유니크), RLS 본인 소유
- notifications: 인앱 원장, 안읽음 인덱스, RLS 본인 읽기/읽음처리
- 배치용 service_role grant"
```

---

## Task 2: 공유 타입 + 판정 순수함수

**Files:**
- Create: `lib/alerts/types.ts`
- Create: `lib/alerts/evaluate.ts`
- Test: `lib/alerts/evaluate.test.ts`

**Interfaces:**
- Produces:
  - `type AlertDirection = 'below' | 'above'`
  - `interface ActiveAlert { id: string; userId: string; cardPrintingId: string; currency: string; gradeLabel: string | null; direction: AlertDirection; threshold: number }`
  - `interface AlertHit { alert: ActiveAlert; currentPrice: number }`
  - `function isThresholdMet(direction: AlertDirection, currentPrice: number, threshold: number): boolean`

- [ ] **Step 1: 실패 테스트 작성**

`lib/alerts/evaluate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isThresholdMet } from './evaluate';

describe('isThresholdMet', () => {
  it('below: 현재가가 임계값보다 낮으면 true', () => {
    expect(isThresholdMet('below', 9000, 10000)).toBe(true);
  });
  it('below: 현재가가 임계값과 같으면 true (도달 포함)', () => {
    expect(isThresholdMet('below', 10000, 10000)).toBe(true);
  });
  it('below: 현재가가 임계값보다 높으면 false', () => {
    expect(isThresholdMet('below', 11000, 10000)).toBe(false);
  });
  it('above: 현재가가 임계값보다 높으면 true', () => {
    expect(isThresholdMet('above', 11000, 10000)).toBe(true);
  });
  it('above: 현재가가 임계값과 같으면 true', () => {
    expect(isThresholdMet('above', 10000, 10000)).toBe(true);
  });
  it('above: 현재가가 임계값보다 낮으면 false', () => {
    expect(isThresholdMet('above', 9000, 10000)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run lib/alerts/evaluate.test.ts`
Expected: FAIL — `isThresholdMet`/모듈 없음.

- [ ] **Step 3: 타입 + 함수 구현**

`lib/alerts/types.ts`:

```ts
export type AlertDirection = 'below' | 'above';

export interface ActiveAlert {
  id: string;
  userId: string;
  cardPrintingId: string;
  currency: string;
  gradeLabel: string | null;
  direction: AlertDirection;
  threshold: number;
}

export interface AlertHit {
  alert: ActiveAlert;
  currentPrice: number;
}
```

`lib/alerts/evaluate.ts` (판정 함수만 우선):

```ts
import type { AlertDirection } from './types';

/** 목표가 도달 판정. 경계값(같을 때)은 도달로 본다. */
export function isThresholdMet(
  direction: AlertDirection,
  currentPrice: number,
  threshold: number,
): boolean {
  return direction === 'below' ? currentPrice <= threshold : currentPrice >= threshold;
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run lib/alerts/evaluate.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/alerts/types.ts lib/alerts/evaluate.ts lib/alerts/evaluate.test.ts
git commit -m "feat: 가격 알림 판정 순수함수 isThresholdMet

- 방향(below/above)×경계값 단위테스트
- 공유 타입 ActiveAlert/AlertHit 정의"
```

---

## Task 3: 평가 파이프라인 (printing별 파생가 산출 → 히트)

**Files:**
- Modify: `lib/tcg-catalog.ts` (기존 `fetchSnapshotRowsForPrintings`에 `export` 추가)
- Modify: `lib/alerts/evaluate.ts` (파이프라인 함수 추가)
- Test: `lib/alerts/evaluate.test.ts` (파이프라인 케이스 추가)

**Interfaces:**
- Consumes:
  - `buildPriceHistory(snapshots): PriceHistory` from `lib/tcg-catalog` (이미 export)
  - `derivePriceDisplayFromHistory(history): PriceDisplay | null` from `lib/tcg-catalog` (이미 export)
  - `fetchSnapshotRowsForPrintings(supabase, ids): Promise<Array<CardPriceSnapshotRow & { card_printing_id: string }>>` (이 태스크에서 export)
  - `isThresholdMet`, `ActiveAlert`, `AlertHit` (Task 2)
- Produces:
  - `function computeAlertHits(alerts: ActiveAlert[], snapshotsByPrinting: Map<string, CardPriceSnapshotRow[]>): AlertHit[]`
  - `async function evaluateActiveAlerts(supabase: SupabaseClient): Promise<AlertHit[]>`

- [ ] **Step 1: `fetchSnapshotRowsForPrintings` export**

`lib/tcg-catalog.ts`에서 함수 선언 `async function fetchSnapshotRowsForPrintings(` → `export async function fetchSnapshotRowsForPrintings(`.

- [ ] **Step 2: 파이프라인 실패 테스트 작성**

`lib/alerts/evaluate.test.ts`에 추가:

```ts
import { computeAlertHits } from './evaluate';
import type { ActiveAlert } from './types';

function alert(overrides: Partial<ActiveAlert>): ActiveAlert {
  return {
    id: 'a1', userId: 'u1', cardPrintingId: 'p1', currency: 'KRW',
    gradeLabel: null, direction: 'below', threshold: 10000, ...overrides,
  };
}

// 최소 스냅샷 행 — buildPriceHistory가 asking 시리즈로 접는 형태.
// (실제 CardPriceSnapshotRow 필수 필드에 맞춰 채운다. 아래는 예시 형태이며
//  buildPriceHistory가 요구하는 필드를 실제 타입에서 확인해 채울 것.)
function snap(date: string, avg: number) {
  return {
    snapshot_date: date, market: 'KR', currency: 'KRW', variant: 'raw',
    condition_label: null, grade_company: null, grade_value: null,
    source_name: 'kream', source_url: null, aggregation_method: 'median_filtered',
    avg_price: avg, min_price: avg, max_price: avg, sample_count: 3,
    display_currency: 'KRW', display_avg_price: avg, display_min_price: avg,
    display_max_price: avg,
  } as unknown as import('@/lib/tcg-catalog').CardPriceSnapshotRow;
}

describe('computeAlertHits', () => {
  it('below 도달 시 히트, currentPrice는 파생 대표가', () => {
    const alerts = [alert({ direction: 'below', threshold: 10000 })];
    const byPrinting = new Map([['p1', [snap('2026-07-05', 9000)]]]);
    const hits = computeAlertHits(alerts, byPrinting);
    expect(hits).toHaveLength(1);
    expect(hits[0].currentPrice).toBe(9000);
  });

  it('미도달 시 히트 없음', () => {
    const alerts = [alert({ direction: 'below', threshold: 8000 })];
    const byPrinting = new Map([['p1', [snap('2026-07-05', 9000)]]]);
    expect(computeAlertHits(alerts, byPrinting)).toHaveLength(0);
  });

  it('스냅샷 없는 printing은 스킵(파생가 null)', () => {
    const alerts = [alert({ cardPrintingId: 'pX' })];
    const byPrinting = new Map<string, ReturnType<typeof snap>[]>();
    expect(computeAlertHits(alerts, byPrinting)).toHaveLength(0);
  });
});
```

> **주의:** `snap()`의 필드는 `CardPriceSnapshotRow`(및 `buildPriceHistory`가 소비하는 필드)의 실제 정의를 `lib/tcg-catalog.ts:163` 부근에서 확인해 정확히 채운다. 파생가가 asking/sold 중 무엇으로 접히는지도 그 로직 기준으로 픽스처를 맞춘다.

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run lib/alerts/evaluate.test.ts`
Expected: FAIL — `computeAlertHits` 없음.

- [ ] **Step 4: 파이프라인 구현**

`lib/alerts/evaluate.ts`에 추가:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildPriceHistory,
  derivePriceDisplayFromHistory,
  fetchSnapshotRowsForPrintings,
  type CardPriceSnapshotRow,
} from '@/lib/tcg-catalog';
import type { ActiveAlert, AlertHit } from './types';

/** 각 알림의 printing 파생 대표가를 구해 임계값 판정된 히트만 반환. 순수함수. */
export function computeAlertHits(
  alerts: ActiveAlert[],
  snapshotsByPrinting: Map<string, CardPriceSnapshotRow[]>,
): AlertHit[] {
  const hits: AlertHit[] = [];
  for (const alert of alerts) {
    const snapshots = snapshotsByPrinting.get(alert.cardPrintingId);
    if (!snapshots || snapshots.length === 0) continue;
    const display = derivePriceDisplayFromHistory(buildPriceHistory(snapshots));
    if (!display) continue;
    if (isThresholdMet(alert.direction, display.avgPrice, alert.threshold)) {
      hits.push({ alert, currentPrice: display.avgPrice });
    }
  }
  return hits;
}

interface PriceAlertRow {
  id: string;
  user_id: string;
  card_printing_id: string;
  currency: string;
  grade_label: string | null;
  direction: 'below' | 'above';
  threshold: number;
}

/** 활성 알림 로드 → 대상 printing 스냅샷 일괄 조회 → 히트 산출. */
export async function evaluateActiveAlerts(supabase: SupabaseClient): Promise<AlertHit[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('id, user_id, card_printing_id, currency, grade_label, direction, threshold')
    .eq('is_active', true);
  if (error) throw error;

  const rows = (data ?? []) as PriceAlertRow[];
  if (rows.length === 0) return [];

  const alerts: ActiveAlert[] = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    cardPrintingId: r.card_printing_id,
    currency: r.currency,
    gradeLabel: r.grade_label,
    direction: r.direction,
    threshold: Number(r.threshold),
  }));

  const printingIds = [...new Set(alerts.map((a) => a.cardPrintingId))];
  const snapshotRows = await fetchSnapshotRowsForPrintings(supabase, printingIds);

  const byPrinting = new Map<string, CardPriceSnapshotRow[]>();
  for (const row of snapshotRows) {
    const list = byPrinting.get(row.card_printing_id);
    if (list) list.push(row);
    else byPrinting.set(row.card_printing_id, [row]);
  }

  return computeAlertHits(alerts, byPrinting);
}
```

> `CardPriceSnapshotRow` 타입이 `lib/tcg-catalog.ts`에서 export 안 되어 있으면(현재 `interface CardPriceSnapshotRow` 확인 필요) 이 태스크에서 `export`를 추가한다.

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run lib/alerts/evaluate.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/alerts/evaluate.ts lib/alerts/evaluate.test.ts lib/tcg-catalog.ts
git commit -m "feat: 가격 알림 평가 파이프라인

- computeAlertHits: printing별 파생 대표가로 히트 산출(순수함수)
- evaluateActiveAlerts: 활성 알림 로드+스냅샷 일괄조회
- 카드 상세와 동일한 buildPriceHistory/derivePriceDisplayFromHistory 재사용
- fetchSnapshotRowsForPrintings/CardPriceSnapshotRow export"
```

---

## Task 4: 이메일 발송 래퍼 (Resend)

**Files:**
- Modify: `package.json` (+ `resend`)
- Modify: `.env.example`
- Create: `lib/alerts/email.ts`

**Interfaces:**
- Produces: `async function sendPriceAlertEmail(input: { to: string; cardName: string; direction: AlertDirection; threshold: number; currentPrice: number; currency: string; cardUrl: string }): Promise<{ ok: boolean }>`

- [ ] **Step 1: 의존성 설치**

Run: `pnpm add resend`
Expected: `package.json` dependencies에 `resend` 추가.

- [ ] **Step 2: env 예시 추가**

`.env.example`에 append:

```
# 가격 알림 이메일 (Resend)
RESEND_API_KEY=
PRICE_ALERT_FROM_EMAIL=alerts@tcground.example
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: 발송 래퍼 구현**

`lib/alerts/email.ts`:

```ts
import { Resend } from 'resend';
import type { AlertDirection } from './types';

interface SendInput {
  to: string;
  cardName: string;
  direction: AlertDirection;
  threshold: number;
  currentPrice: number;
  currency: string;
  cardUrl: string;
}

function fmt(n: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(n);
}

/** 가격 알림 이메일 1건 발송. 실패해도 throw하지 않고 { ok:false } 반환. */
export async function sendPriceAlertEmail(input: SendInput): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PRICE_ALERT_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('[price-alert] RESEND_API_KEY/PRICE_ALERT_FROM_EMAIL 미설정 — 이메일 스킵');
    return { ok: false };
  }

  const dirText = input.direction === 'below' ? '이하로 떨어졌어요' : '이상으로 올랐어요';
  const subject = `[TCGround] ${input.cardName} 가격 알림`;
  const html = `
    <p><strong>${input.cardName}</strong> 시세가 설정하신 목표가 ${dirText}.</p>
    <ul>
      <li>목표가: ${fmt(input.threshold, input.currency)} (${input.direction === 'below' ? '이하' : '이상'})</li>
      <li>현재가: ${fmt(input.currentPrice, input.currency)}</li>
    </ul>
    <p><a href="${input.cardUrl}">카드 상세 보기</a></p>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to: input.to, subject, html });
    if (error) {
      console.warn('[price-alert] Resend 발송 실패', error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[price-alert] Resend 예외', err instanceof Error ? err.message : err);
    return { ok: false };
  }
}
```

- [ ] **Step 4: 타입체크**

Run: `pnpm tsc --noEmit` (또는 프로젝트 lint) — `lib/alerts/email.ts` 에러 없음.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example lib/alerts/email.ts
git commit -m "feat: 가격 알림 이메일 발송 래퍼(Resend)

- sendPriceAlertEmail: 실패해도 throw 없이 ok:false 반환(인앱이 원장)
- env 미설정 시 스킵, 신규 env 3개 .env.example 추가"
```

---

## Task 5: 배치 훅 — 발송·인앱·비활성화 (deliver)

**Files:**
- Modify: `lib/alerts/evaluate.ts` (`deliverAlertHits` 추가)
- Modify: `scripts/collect-kream-search-page.ts` (훅 호출)
- Test: `lib/alerts/evaluate.test.ts` (deliver 케이스 — 목 supabase)

**Interfaces:**
- Consumes: `AlertHit` (Task 2), `sendPriceAlertEmail` (Task 4), `evaluateActiveAlerts` (Task 3)
- Produces:
  - `async function deliverAlertHits(supabase: SupabaseClient, hits: AlertHit[]): Promise<{ delivered: number }>`
  - `async function runPriceAlertEvaluation(supabase: SupabaseClient): Promise<{ hits: number; delivered: number }>`

- [ ] **Step 1: deliver 실패 테스트 작성**

`lib/alerts/evaluate.test.ts`에 추가 (인앱 insert + 알림 비활성화가 히트 수만큼 호출되는지 검증, Resend는 모듈 목):

```ts
import { vi } from 'vitest';
vi.mock('./email', () => ({ sendPriceAlertEmail: vi.fn(async () => ({ ok: true })) }));
import { deliverAlertHits } from './evaluate';

function fakeSupabase() {
  const calls = { notifInsert: 0, alertUpdate: 0, emailLookups: 0 };
  const supabase = {
    from(table: string) {
      if (table === 'notifications') {
        return { insert: async () => { calls.notifInsert++; return { error: null }; } };
      }
      if (table === 'price_alerts') {
        return {
          update: () => ({ eq: async () => { calls.alertUpdate++; return { error: null }; } }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    auth: {
      admin: {
        getUserById: async () => { calls.emailLookups++; return { data: { user: { email: 'u@e.com' } }, error: null }; },
      },
    },
  };
  return { supabase, calls };
}

describe('deliverAlertHits', () => {
  it('히트마다 인앱 insert + 알림 비활성화', async () => {
    const { supabase, calls } = fakeSupabase();
    const hits = [{
      alert: { id: 'a1', userId: 'u1', cardPrintingId: 'p1', currency: 'KRW',
        gradeLabel: null, direction: 'below' as const, threshold: 10000 },
      currentPrice: 9000,
    }];
    const res = await deliverAlertHits(supabase as never, hits);
    expect(res.delivered).toBe(1);
    expect(calls.notifInsert).toBe(1);
    expect(calls.alertUpdate).toBe(1);
  });
});
```

> **주의:** 실제 `deliverAlertHits`가 카드명/URL을 얻으려면 printing→card 조회가 필요하다. 위 목은 최소 형태이며, 구현에서 카드명 조회 경로(아래 Step 2)에 맞춰 목을 보강한다. 목이 구현과 어긋나면 목을 구현 쪽에 맞춘다(로직을 목에 맞추지 말 것).

- [ ] **Step 2: deliver 구현**

`lib/alerts/evaluate.ts`에 추가:

```ts
import { sendPriceAlertEmail } from './email';

async function loadPrintingCardInfo(
  supabase: SupabaseClient,
  printingIds: string[],
): Promise<Map<string, { cardName: string; slug: string }>> {
  const { data, error } = await supabase
    .from('card_printings')
    .select('id, cards(name, slug)')
    .in('id', printingIds);
  if (error) throw error;
  const map = new Map<string, { cardName: string; slug: string }>();
  for (const row of (data ?? []) as Array<{ id: string; cards: { name: string; slug: string } | null }>) {
    if (row.cards) map.set(row.id, { cardName: row.cards.name, slug: row.cards.slug });
  }
  return map;
}

/** 히트를 인앱 insert + 이메일 발송 + 알림 비활성화로 처리. */
export async function deliverAlertHits(
  supabase: SupabaseClient,
  hits: AlertHit[],
): Promise<{ delivered: number }> {
  if (hits.length === 0) return { delivered: 0 };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const cardInfo = await loadPrintingCardInfo(
    supabase,
    [...new Set(hits.map((h) => h.alert.cardPrintingId))],
  );

  let delivered = 0;
  for (const hit of hits) {
    const info = cardInfo.get(hit.alert.cardPrintingId);
    const cardName = info?.cardName ?? '카드';
    const cardUrl = info ? `${siteUrl}/cards/${info.slug}` : siteUrl;
    const dirText = hit.alert.direction === 'below' ? '이하로 떨어졌습니다' : '이상으로 올랐습니다';

    // 인앱 원장 (실패해도 개별 로깅, 다음 히트 진행)
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: hit.alert.userId,
      alert_id: hit.alert.id,
      title: `${cardName} 가격 알림`,
      body: `${hit.alert.threshold} ${hit.alert.direction === 'below' ? '이하' : '이상'} 목표가 ${dirText}. 현재가 ${hit.currentPrice}.`,
      card_printing_id: hit.alert.cardPrintingId,
    });
    if (notifErr) {
      console.warn('[price-alert] notifications insert 실패', notifErr);
      continue; // 원장 실패 시 알림을 비활성화하지 않음 → 다음 배치 재시도
    }

    // 이메일 (실패해도 알림은 원장에 남았으므로 계속)
    const { data: userData } = await supabase.auth.admin.getUserById(hit.alert.userId);
    const email = userData?.user?.email;
    if (email) {
      await sendPriceAlertEmail({
        to: email, cardName, direction: hit.alert.direction,
        threshold: hit.alert.threshold, currentPrice: hit.currentPrice,
        currency: hit.alert.currency, cardUrl,
      });
    }

    // 1회 발송 후 비활성화
    const { error: updErr } = await supabase
      .from('price_alerts')
      .update({ is_active: false, fired_at: new Date().toISOString() })
      .eq('id', hit.alert.id);
    if (updErr) {
      console.warn('[price-alert] 알림 비활성화 실패', updErr);
      continue;
    }
    delivered++;
  }
  return { delivered };
}

/** 배치 진입점: 평가 → 전달. 실패는 호출측에서 격리. */
export async function runPriceAlertEvaluation(
  supabase: SupabaseClient,
): Promise<{ hits: number; delivered: number }> {
  const hits = await evaluateActiveAlerts(supabase);
  const { delivered } = await deliverAlertHits(supabase, hits);
  return { hits: hits.length, delivered };
}
```

- [ ] **Step 3: 통과 확인**

Run: `pnpm vitest run lib/alerts/evaluate.test.ts`
Expected: PASS (deliver 테스트 포함).

- [ ] **Step 4: 배치 훅 연결**

`scripts/collect-kream-search-page.ts` — import 추가:

```ts
import { runPriceAlertEvaluation } from '../lib/alerts/evaluate';
```

`main()`의 `upsertSnapshots` 블록(현재 96-99) 바로 뒤에 삽입:

```ts
  if (!dryRun && displaySnapshots.length > 0) {
    const written = await upsertSnapshots(supabase, displaySnapshots);
    console.log(`[kream-search-page] upserted ${written} snapshots`);
  }

  // 가격 알림 평가는 시세 수집과 독립. 실패해도 배치 전체는 성공 처리.
  if (!dryRun) {
    try {
      const result = await runPriceAlertEvaluation(supabase);
      console.log(`[price-alert] hits=${result.hits} delivered=${result.delivered}`);
    } catch (err) {
      console.warn('[price-alert] 평가 실패(수집은 성공)', err instanceof Error ? err.message : err);
    }
  }
```

- [ ] **Step 5: 배치 dry 확인**

Run: `KREAM_COLLECTION_ENABLED=true node --env-file=.env.local --import tsx scripts/collect-kream-search-page.ts --segmented --max-scrolls 0 --dry-run`
Expected: 에러 없이 종료. `--dry-run`이라 평가 스킵 로그 없음(혹은 수집 로그만).

- [ ] **Step 6: Commit**

```bash
git add lib/alerts/evaluate.ts lib/alerts/evaluate.test.ts scripts/collect-kream-search-page.ts
git commit -m "feat: 가격 알림 배치 전달 + collect:daily 훅

- deliverAlertHits: 인앱 insert→이메일→1회 발송 후 비활성화
- 원장(인앱) 실패 시 비활성화 보류(다음 배치 재시도)
- 수집 성공과 독립된 try/catch로 훅 연결"
```

---

## Task 6: 알림 생성/해제 Server Action

**Files:**
- Create: `app/cards/[cardId]/_actions/price-alert.ts`
- Test: `app/cards/[cardId]/_actions/price-alert.test.ts`

**Interfaces:**
- Produces:
  - `interface SetPriceAlertInput { cardPrintingId: string; slug: string; currency: string; gradeLabel: string | null; direction: 'below' | 'above'; threshold: number }`
  - `async function setPriceAlert(input: SetPriceAlertInput): Promise<{ ok: true } | { ok: false; error: string }>`
  - `async function clearPriceAlert(input: { cardPrintingId: string; slug: string; direction: 'below' | 'above' }): Promise<{ ok: true } | { ok: false; error: string }>`
  - `function isValidThreshold(n: number): boolean`

- [ ] **Step 1: 입력검증 실패 테스트 작성**

`app/cards/[cardId]/_actions/price-alert.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isValidThreshold } from './price-alert';

describe('isValidThreshold', () => {
  it('양수 통과', () => expect(isValidThreshold(10000)).toBe(true));
  it('0 이하 거부', () => expect(isValidThreshold(0)).toBe(false));
  it('음수 거부', () => expect(isValidThreshold(-1)).toBe(false));
  it('NaN 거부', () => expect(isValidThreshold(Number.NaN)).toBe(false));
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run app/cards/[cardId]/_actions/price-alert.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 액션 구현**

`app/cards/[cardId]/_actions/price-alert.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface SetPriceAlertInput {
  cardPrintingId: string;
  slug: string;
  currency: string;
  gradeLabel: string | null;
  direction: 'below' | 'above';
  threshold: number;
}

export type PriceAlertResult = { ok: true } | { ok: false; error: string };

export function isValidThreshold(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export async function setPriceAlert(input: SetPriceAlertInput): Promise<PriceAlertResult> {
  if (input.direction !== 'below' && input.direction !== 'above') {
    return { ok: false, error: '잘못된 알림 방향입니다.' };
  }
  if (!isValidThreshold(input.threshold)) {
    return { ok: false, error: '목표가는 0보다 큰 숫자여야 합니다.' };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: '알림을 설정하려면 로그인이 필요합니다.' };

  // (user, printing, direction) 활성 유니크 → 재설정은 upsert.
  const { error } = await supabase.from('price_alerts').upsert(
    {
      user_id: userId,
      card_printing_id: input.cardPrintingId,
      currency: input.currency,
      grade_label: input.gradeLabel,
      direction: input.direction,
      threshold: input.threshold,
      is_active: true,
      fired_at: null,
    },
    { onConflict: 'user_id,card_printing_id,direction' },
  );
  if (error) return { ok: false, error: '알림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };

  revalidatePath(`/cards/${input.slug}`);
  return { ok: true };
}

export async function clearPriceAlert(input: {
  cardPrintingId: string;
  slug: string;
  direction: 'below' | 'above';
}): Promise<PriceAlertResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('price_alerts')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('card_printing_id', input.cardPrintingId)
    .eq('direction', input.direction)
    .eq('is_active', true);
  if (error) return { ok: false, error: '알림을 해제하지 못했습니다.' };

  revalidatePath(`/cards/${input.slug}`);
  return { ok: true };
}
```

> **주의:** `upsert`의 `onConflict`는 **부분 유니크 인덱스**(`where is_active`)를 대상으로 한다. Postgres에서 부분 유니크는 `on conflict` 추론이 안 될 수 있다. 이 경우 upsert 대신 "기존 활성 행 update, 없으면 insert" 2-스텝 또는 `on conflict` 미지원 시 명시적 처리로 바꾼다. Step 5 통합 확인에서 실제 동작으로 검증할 것.

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run app/cards/[cardId]/_actions/price-alert.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: upsert 충돌추론 실동작 확인**

Run: 로컬 DB에 로그인 세션으로 같은 (printing, direction) 알림 2회 설정 → 행 1개 유지·threshold 갱신 확인. (부분 유니크 `on conflict` 실패 시 위 주의대로 2-스텝으로 교체 후 재확인.)
Expected: 활성 행 1개, threshold 최신값.

- [ ] **Step 6: Commit**

```bash
git add "app/cards/[cardId]/_actions/price-alert.ts" "app/cards/[cardId]/_actions/price-alert.test.ts"
git commit -m "feat: 가격 알림 생성/해제 Server Action

- setPriceAlert: 방향·목표가 검증, (user,printing,direction) 재설정
- clearPriceAlert: is_active=false 해제
- isValidThreshold 단위테스트"
```

---

## Task 7: 알림 버튼 + 다이얼로그 UI

**Files:**
- Create: `app/cards/[cardId]/_components/PriceAlertButton.tsx`
- Modify: `app/cards/[cardId]/page.tsx` (정적 버튼 교체 + 활성알림 조회)

**Interfaces:**
- Consumes: `setPriceAlert`, `clearPriceAlert` (Task 6); `Dialog/Input/Label/RadioGroup/Button` from `@tcground/ui`
- Produces: `<PriceAlertButton cardPrintingId slug currency gradeLabel isAuthenticated existingAlert />`

- [ ] **Step 1: 버튼/다이얼로그 컴포넌트**

`app/cards/[cardId]/_components/PriceAlertButton.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Input, Label, RadioGroup, RadioGroupItem,
} from '@tcground/ui';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { setPriceAlert, clearPriceAlert } from '../_actions/price-alert';

type Direction = 'below' | 'above';

interface ExistingAlert {
  direction: Direction;
  threshold: number;
}

interface Props {
  cardPrintingId: string;
  slug: string;
  currency: string;
  gradeLabel: string | null;
  isAuthenticated: boolean;
  existingAlert: ExistingAlert | null;
}

export function PriceAlertButton({
  cardPrintingId, slug, currency, gradeLabel, isAuthenticated, existingAlert,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>(existingAlert?.direction ?? 'below');
  const [threshold, setThreshold] = useState(existingAlert ? String(existingAlert.threshold) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button type='button' variant='outline' size='cta'
        onClick={() => router.push(`/login?redirect=/cards/${slug}`)}>
        <Bell className='size-5' aria-hidden /> 가격 알림 설정
      </Button>
    );
  }

  const label = existingAlert ? '알림 설정됨' : '가격 알림 설정';

  function submit() {
    setError(null);
    const n = Number(threshold);
    startTransition(async () => {
      const res = await setPriceAlert({
        cardPrintingId, slug, currency, gradeLabel, direction, threshold: n,
      });
      if (res.ok) { setOpen(false); router.refresh(); }
      else setError(res.error);
    });
  }

  function clear() {
    startTransition(async () => {
      const res = await clearPriceAlert({ cardPrintingId, slug, direction });
      if (res.ok) { setOpen(false); router.refresh(); }
      else setError(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type='button' variant={existingAlert ? 'default' : 'outline'} size='cta'>
          <Bell className='size-5' aria-hidden /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>가격 알림{gradeLabel ? ` · ${gradeLabel}` : ''}</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <RadioGroup value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='below' id='dir-below' />
              <Label htmlFor='dir-below'>이 가격 이하로 떨어지면</Label>
            </div>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='above' id='dir-above' />
              <Label htmlFor='dir-above'>이 가격 이상으로 오르면</Label>
            </div>
          </RadioGroup>
          <div className='flex flex-col gap-1'>
            <Label htmlFor='threshold'>목표가 ({currency})</Label>
            <Input id='threshold' type='number' inputMode='numeric' min='1'
              value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          {error && <p className='text-tcg-red text-sm'>{error}</p>}
          <div className='flex gap-2'>
            <Button type='button' onClick={submit} disabled={pending || !threshold}>
              {existingAlert ? '알림 수정' : '알림 설정'}
            </Button>
            {existingAlert && (
              <Button type='button' variant='outline' onClick={clear} disabled={pending}>
                알림 해제
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

> **주의:** `RadioGroup`/`RadioGroupItem`/`DialogTrigger` 등의 정확한 export 이름은 `packages/ui/src/components/ui/radio-group.tsx`·`dialog.tsx`에서 확인해 맞춘다. `variant`/`size` 값은 `button.tsx`의 실제 variant 집합(`cta` 등 기존 사용)을 따른다.

- [ ] **Step 2: page.tsx에서 활성 알림 조회 + 버튼 교체**

`app/cards/[cardId]/page.tsx` — 정적 "가격 알림 설정" 버튼(263-266)을 `PriceAlertButton`으로 교체. 활성 알림/인증은 auth 의존이므로 기존 `CardRatingSection`처럼 **Suspense 경계 안**에서 조회한다. `CardDetailContent`에 `alertSlot?: ReactNode`를 추가하고, "관심 카드 추가/가격 알림" 버튼 묶음 자리에 슬롯을 렌더한다.

`page.tsx` 상단 import 추가:

```tsx
import { PriceAlertButton } from './_components/PriceAlertButton';
```

`CardDetailPage` 렌더의 `CardDetailContent`에 슬롯 전달 (rating과 같은 방식):

```tsx
        <CardDetailContent
          card={card}
          ratingSlot={
            <Suspense fallback={<CardRatingSkeleton />}>
              <CardRatingSection cardId={card.cardId} slug={card.slug} />
            </Suspense>
          }
          alertSlot={
            <Suspense fallback={null}>
              <PriceAlertSection card={card} />
            </Suspense>
          }
        />
```

신규 async 서버 컴포넌트 (page.tsx 내, `CardRatingSection` 옆):

```tsx
async function PriceAlertSection({ card }: { card: CatalogCardDetail }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claims?.claims?.sub);

  let existingAlert: { direction: 'below' | 'above'; threshold: number } | null = null;
  if (isAuthenticated) {
    const { data } = await supabase
      .from('price_alerts')
      .select('direction, threshold')
      .eq('card_printing_id', card.printing.id)
      .eq('is_active', true)
      .maybeSingle();
    if (data) existingAlert = { direction: data.direction, threshold: Number(data.threshold) };
  }

  return (
    <PriceAlertButton
      cardPrintingId={card.printing.id}
      slug={card.slug}
      currency={card.price.currency}
      gradeLabel={card.priceHistory.gradeLabel}
      isAuthenticated={isAuthenticated}
      existingAlert={existingAlert}
    />
  );
}
```

`CardDetailContentProps`에 `alertSlot?: ReactNode` 추가하고, 258-267의 버튼 묶음에서 정적 "가격 알림 설정" `<Button>`을 `{alertSlot}`으로 교체 (관심 카드 버튼은 유지):

```tsx
          <div className='mt-2 flex flex-wrap gap-4'>
            <Button type='button' size='cta' className='hover:scale-[1.02]'>
              <CirclePlus className='size-5' aria-hidden />
              관심 카드 추가
            </Button>
            {alertSlot}
          </div>
```

> `maybeSingle()`은 활성 알림이 방향별로 최대 2개일 수 있으니(below/above) 엄밀히는 복수다. 이 슬롯은 대표 1개만 편집하는 단순 UI다 — below 우선으로 하나만 불러오려면 `.order('direction').limit(1)` 후 첫 행 사용. 복수 방향 동시 편집은 범위 밖(스펙 YAGNI). 여기선 `.limit(1).maybeSingle()` 대신 `.order('created_at', { ascending: false }).limit(1)` 배열 첫 행을 쓴다.

- [ ] **Step 3: 타입체크/렌더 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS. 로그인 상태로 카드 상세 진입 → 다이얼로그 열기/설정/해제 수동 확인.

- [ ] **Step 4: Commit**

```bash
git add "app/cards/[cardId]/_components/PriceAlertButton.tsx" "app/cards/[cardId]/page.tsx"
git commit -m "feat: 카드 상세 가격 알림 버튼+다이얼로그

- 방향(이하/이상)+목표가 입력, 판본 단위 설정/수정/해제
- 활성 알림은 auth 의존이라 Suspense 경계에서 조회
- 미로그인 시 로그인 유도"
```

---

## Task 8: 헤더 알림 벨 + 안읽음 배지 + 읽음 처리

**Files:**
- Create: `components/tcg/layout/NotificationBell.tsx`
- Create: `app/notifications/_actions/mark-read.ts`
- Modify: `components/tcg/layout/PublicHeader.tsx`

**Interfaces:**
- Consumes: `createClient` (server), `DropdownMenu` from `@tcground/ui`
- Produces:
  - `async function markNotificationRead(id: string): Promise<{ ok: boolean }>`
  - `<NotificationBell />` (async 서버 컴포넌트)

- [ ] **Step 1: 읽음 처리 액션**

`app/notifications/_actions/mark-read.ts`:

```ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { ok: false };

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null); // RLS가 소유 보장
  return { ok: !error };
}
```

- [ ] **Step 2: 벨 컴포넌트**

`components/tcg/layout/NotificationBell.tsx`:

```tsx
import Link from 'next/link';
import { Bell } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@tcground/ui';
import { createClient } from '@/lib/supabase/server';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  card_printing_id: string | null;
}

export async function NotificationBell() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return null; // 미로그인 시 벨 미표시

  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, read_at, card_printing_id')
    .order('created_at', { ascending: false })
    .limit(20);
  const rows = (data ?? []) as NotificationRow[];
  const unread = rows.filter((r) => r.read_at === null).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='relative inline-flex size-9 items-center justify-center'>
        <Bell className='size-5' aria-hidden />
        {unread > 0 && (
          <span className='bg-tcg-red text-primary-foreground absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold'>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <span className='sr-only'>알림 {unread}건</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-80'>
        {rows.length === 0 && (
          <DropdownMenuItem disabled>알림이 없습니다.</DropdownMenuItem>
        )}
        {rows.map((r) => (
          <DropdownMenuItem key={r.id} asChild>
            <Link href={r.card_printing_id ? `/notifications/${r.id}` : '#'}
              className={r.read_at ? 'opacity-60' : 'font-semibold'}>
              <span className='flex flex-col'>
                <span>{r.title}</span>
                <span className='text-muted-foreground text-xs'>{r.body}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

> **주의:** 클릭 시 읽음 처리 + 카드 이동을 한 번에 하려면 라우트가 필요하다. **YAGNI 우선**: 이 태스크는 `/notifications/[id]` 라우트를 만들지 말고, 목록 항목 클릭이 곧바로 카드 상세로 가되 읽음 처리는 **드롭다운 열림 시 안읽음 전체를 읽음 처리**하는 단순화도 가능하다. 실제 export 이름(`DropdownMenuTrigger` 등)은 `packages/ui/src/components/ui/dropdown-menu.tsx`에서 확인. printing→card slug 매핑이 필요하면 위 select에 `card_printings(cards(slug))` 조인을 추가한다. 라우트 신설 여부는 구현자가 최소안으로 결정하고 스펙 범위(인앱 배지+목록+읽음)를 벗어나지 말 것.

- [ ] **Step 3: PublicHeader에 벨 슬롯**

`components/tcg/layout/PublicHeader.tsx`에서 헤더 우측 액션 영역에 `<NotificationBell />` 렌더. `PublicHeader`가 async 서버 컴포넌트가 아니면, 벨을 자체 Suspense로 감싸 삽입하거나 `PublicHeader`의 기존 auth 렌더 지점에 맞춘다. (기존 헤더 구조 확인 후 로그인 영역 옆에 배치.)

```tsx
import { Suspense } from 'react';
import { NotificationBell } from './NotificationBell';
// ... 헤더 우측 액션 묶음에:
<Suspense fallback={null}>
  <NotificationBell />
</Suspense>
```

- [ ] **Step 4: 타입체크 + 수동 확인**

Run: `pnpm tsc --noEmit`
Expected: PASS. 로그인 + 인앱 알림 존재 시 벨에 배지, 드롭다운에 목록 표시.

- [ ] **Step 5: Commit**

```bash
git add components/tcg/layout/NotificationBell.tsx components/tcg/layout/PublicHeader.tsx app/notifications/_actions/mark-read.ts
git commit -m "feat: 헤더 알림 벨 + 안읽음 배지 + 읽음 처리

- 로그인 유저만 벨 표시, 안읽음 카운트 배지
- 드롭다운 최근 20건 목록, 읽음 처리 액션
- 미로그인 시 벨 미표시"
```

---

## Task 9: 최종 검증 + 문서

**Files:**
- Modify: `memory-bank/prd/price-alerts.md` (구현 완료 상태 갱신, 필요 시)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm vitest run lib/alerts app/cards`
Expected: 모든 알림 관련 테스트 PASS.

- [ ] **Step 2: 배치 dry 통합 확인**

Run: `KREAM_COLLECTION_ENABLED=true node --env-file=.env.local --import tsx scripts/collect-kream-search-page.ts --segmented --max-scrolls 0 --dry-run`
Expected: 에러 없이 종료.

- [ ] **Step 3: 실 시나리오 확인 (로컬)**

수동: 로그인 → 카드 상세에서 현재가보다 높은 목표가로 'below' 알림 설정 → `runPriceAlertEvaluation`을 non-dry로 1회 실행(또는 배치 실행) → 인앱 벨 배지 증가 + 알림 `is_active=false` 확인. (이메일은 `RESEND_API_KEY` 설정 시 수신 확인, 미설정 시 스킵 로그.)

- [ ] **Step 4: 스펙 상태 갱신 + Commit**

`memory-bank/prd/price-alerts.md` 상단 상태를 `구현 완료`로.

```bash
git add memory-bank/prd/price-alerts.md
git commit -m "docs: 가격 알림 구현 완료 상태 반영"
```

---

## Self-Review 결과

**스펙 커버리지:** 채널(이메일+인앱) Task4/5/8 · 양방향 조건 Task2/6 · 판본별 파생가 감시 Task3 · 1회발송후 비활성 Task5 · collect:daily 훅 Task5 · 데이터모델 Task1 · UI Task7 · 에러격리 Task5(try/catch) · 테스트 Task2/3/6. 전 항목 태스크 매핑됨.

**미해결 위험(구현 중 실동작으로 확정할 것):**
1. 부분 유니크(`where is_active`) 대상 `on conflict` 추론 — Task6 Step5에서 검증, 실패 시 2-스텝 update-or-insert로 교체.
2. `@tcground/ui`의 정확한 export 이름/variant — Task7/8에서 실제 컴포넌트 파일 확인 후 맞춤.
3. printing→card slug 매핑(이메일/인앱 링크) — Task5 `loadPrintingCardInfo`, Task8 목록. `cards(name, slug)` 조인 형태는 실제 스키마 관계로 검증.
4. `CardPriceSnapshotRow` export 여부 — Task3에서 필요 시 export 추가.
