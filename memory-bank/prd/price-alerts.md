# 가격 알림 (Price Alerts) — 설계 스펙

작성일: 2026-07-06
상태: 설계 확정, 구현 전

## 목표

유저가 특정 카드 시세에 목표가를 설정하면, 시세가 그 목표가에 도달했을 때
이메일과 인앱 알림으로 통지한다.

## 핵심 전제

- 시세는 **하루 1회 배치**(`pnpm collect:daily`, 로컬 launchd
  `com.tcground.daily-price-collection.plist`)로만 갱신된다. 실시간 평가는
  불필요하며, 평가는 이 배치 집계 직후에 붙는다.
- 알림 채널 인프라는 현재 전무하다. 이메일(Resend)과 인앱 알림을 새로 만든다.

## 확정된 결정

| 항목 | 결정 |
|---|---|
| 전달 채널 | 이메일(Resend) + 인앱 알림 둘 다 |
| 알림 조건 | 목표가 **하회/상회 양방향** (유저가 가격 X + 방향 지정) |
| 감시 시세 단위 | **판본(printing)별 파생 대표가** — 카드 상세가 보여주는 그 값 |
| 트리거 후 | **1회 발송 후 비활성화** (유저가 재설정하면 재가동) |
| 평가 위치 | **A안** — `collect:daily` 집계 끝단에 평가 단계 추가 |
| 시리즈 식별 | 카드 상세의 시세는 스냅샷 1행이 아니라 **파생 블렌드값**(`collapseByDate`가 market 평균, `getPriceTrendSeries`가 asking/sold 택1). 깔끔한 스냅샷키가 없어 스냅샷키 매칭 불가. 대신 배치가 페이지와 **동일 함수** `derivePriceDisplayFromHistory`를 판본별로 재호출해 `avgPrice` 비교 → 로직 중복 0, 블렌드 정확 동일 |

## 데이터 모델 (신규 마이그레이션 2 테이블)

### price_alerts
```
id                uuid pk default gen_random_uuid()
user_id           uuid not null references auth.users(id) on delete cascade
card_printing_id  uuid not null references public.card_printings(id) on delete cascade
currency          text not null   -- 표시 통화 (card.price.currency), 임계값 해석 기준
grade_label       text            -- nullable, 맥락/표시용 (파생가의 등급 라벨, raw면 null)
-- 조건
direction         text not null   -- 'below' | 'above'  (check 제약)
threshold         numeric(14,2) not null
-- 상태
is_active         boolean not null default true
created_at        timestamptz not null default now()
fired_at          timestamptz     -- nullable, 발송 시각
```
- NOT NULL: `currency / direction / threshold`
- nullable: `grade_label / fired_at`
- `direction` check: `direction in ('below','above')`
- 감시 대상 = **판본(printing)의 파생 대표가**. 배치가 이 printing의
  스냅샷으로 `buildPriceHistory` → `derivePriceDisplayFromHistory`를 돌려
  나온 `avgPrice`를 threshold와 비교한다. `grade_label`은 매칭에 안 쓰고
  이메일/인앱 문구용으로만 저장한다.
- RLS: 본인(`user_id = auth.uid()`) 것만 select/insert/update/delete
- 인덱스: `(is_active)` 배치 스캔용, `(user_id)` 조회용
- 유니크: `(user_id, card_printing_id, direction) where is_active` 부분 유니크 —
  한 판본·방향당 활성 알림 1개 (재설정 시 기존 것 갱신/교체)

### notifications (인앱 배지/목록의 원장)
```
id                uuid pk default gen_random_uuid()
user_id           uuid not null references auth.users(id) on delete cascade
alert_id          uuid references public.price_alerts(id) on delete set null
title             text not null
body              text not null
card_printing_id  uuid references public.card_printings(id) on delete set null
read_at           timestamptz     -- nullable, null = 안읽음
created_at        timestamptz not null default now()
```
- RLS: 본인 것만 select / update(`read_at`만). insert는 service_role(배치).
- 인덱스: `(user_id, read_at)` 안읽음 배지 카운트용
- 이메일용 별도 테이블 없음 — 발송만 하고 이 행이 발송 기록 역할

## 파생 대표가 재사용 (스냅샷키 매칭 불가 → 함수 재호출)

카드 상세의 시세는 원본 스냅샷 1행이 아니라 파생 블렌드값이다:
`buildPriceHistory(snapshots)` → `getPriceTrendSeries`(asking/sold 택1) →
`collapseByDate`(같은 날짜의 여러 market 평균) → `derivePriceDisplayFromHistory`.
`PricePoint`/`PriceHistory`엔 variant/market/grade 식별자가 없어 깔끔한
스냅샷키가 존재하지 않는다. 따라서 알림은 스냅샷키가 아니라 **판본별 파생
대표가**를 감시하고, 배치는 페이지와 **동일한 export 함수**를 재호출한다:

- `buildPriceHistory(snapshots): PriceHistory` (이미 export)
- `derivePriceDisplayFromHistory(history): PriceDisplay | null` (이미 export)

로직 중복이 없고 페이지와 완전히 같은 값을 본다. `PriceDisplay`나
`PriceHistory` 타입 변경은 불필요하다.

## 알림 생성 UI

- `app/cards/[cardId]/page.tsx:263`의 기존 무동작 **"가격 알림 설정" 버튼**을
  활성화한다.
- 클릭 → 다이얼로그(`@tcground/ui`의 `Dialog`):
  - 방향 선택(`RadioGroup`): 이하로 떨어지면 / 이상으로 오르면
  - 목표가 입력(`Input` number, 통화는 `card.price.currency`)
  - 대상 = **지금 뷰의 판본**(`card.printing.id`), 맥락 라벨 =
    `card.priceHistory.gradeLabel`
- 미로그인: 버튼 클릭 시 로그인 유도
- 이미 활성 알림 존재(같은 printing·direction): 버튼이 "알림 설정됨" 상태 +
  해제(`is_active=false`) 가능
- insert/해제는 Server Action, RLS로 본인 것만.

## 평가 로직 (collect:daily 끝단 신규 모듈)

훅 지점: `scripts/collect-kream-search-page.ts`의 `main()`에서
`upsertSnapshots` 직후(현재 line 96-99 블록 뒤). 이미 있는 `supabase`
(admin 클라이언트) 재사용. 집계 완료 직후 **독립 단계**로 실행:
```
1. 활성 알림 로드 (is_active = true) — card_printing_id, currency, direction,
   threshold, user_id
2. 대상 printing들의 스냅샷 일괄 조회 (.in('card_printing_id', ids))
   → printing별 그룹
3. printing마다:
   history = buildPriceHistory(그 printing 스냅샷들)
   display = derivePriceDisplayFromHistory(history)
   display 없으면(데이터 없음) 스킵
4. 판정(순수함수):
   direction = 'below' → display.avgPrice <= threshold
   direction = 'above' → display.avgPrice >= threshold
5. 충족분 처리 (알림 단위):
   - notifications insert
   - 이메일 발송 (Resend)
   - price_alerts: is_active = false, fired_at = now()
```
- 파생 대표가 못 구한 printing(`derive...` = null) → 스킵, 알림 유지
- 배치는 service_role(admin 클라이언트)로 전건 접근

## 전달

### 이메일 (Resend)
- 신규 의존성 `resend`, 신규 env `RESEND_API_KEY` (+ 발신 주소 env)
- 수신 = `auth.users.email` (service_role 조회)
- 본문: 카드명 / 설정한 방향·목표가 / 현재가 / 카드 상세 링크
- 발송 실패해도 인앱 `notifications` 행은 남기고 알림은 비활성 처리한다.
  발송 실패는 로깅만. (인앱이 원장)

### 인앱
- 헤더(`PublicHeader`)에 벨 아이콘 + 안읽음 배지
  (`notifications` where `read_at is null` count)
- 드롭다운/목록: 항목 클릭 시 `read_at` 세팅 + 해당 카드로 이동
- 서버 컴포넌트 조회, 로그인 유저만. 미로그인 시 벨 미표시 또는 로그인 유도.

## 에러 / 경계

- **평가 실패가 시세 수집 성공을 롤백하면 안 된다.** 평가는 수집 완료 뒤
  독립 `try/catch`로 감싸고, 실패는 로깅만 하고 배치 전체는 성공 처리.
- 이메일 실패 ≠ 알림 실패. 인앱 `notifications` 행이 원장.
- RLS: 알림/노티는 본인 것만. 배치 평가·노티 insert는 service_role.
- 발송 대상이 없는 정상 케이스(활성 알림 0, 충족 0)는 no-op.

## 테스트

- **판정 순수함수** 단위테스트: 방향(below/above) × 경계값(<, =, >).
  기존 vitest 패턴(`lib/pricing/*.test.ts`) 따름.
- **평가 파이프라인**: 스냅샷 + 알림 픽스처 → 발송 대상 산출 검증
  (`buildPriceHistory`/`derivePriceDisplayFromHistory` 실제 사용, 발송·DB
  쓰기는 목/스텁).
- 순수 판정 로직과 I/O(조회·발송·상태변경)를 분리해 판정만 프레임워크 없이
  테스트 가능하게 둔다.

## 범위 밖 (YAGNI)

- 재무장/재가동 자동화 (1회 발송 후 비활성화만)
- % 변동률 알림
- 웹 푸시(PWA), SMS/카카오 등 추가 채널
- 등급 독립 선택 UI (페이지가 판본당 파생가 1개만 노출 → printing 단위가 최대 granularity)
