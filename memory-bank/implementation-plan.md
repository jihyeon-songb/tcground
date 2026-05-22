# IMPLEMENTATION PLAN

> PRD를 단계와 작업으로 분해한 실행 계획.
> 마지막 갱신: 2026-05-23 (외부 이미지 최적화)

## 현재 기준 PRD

- `memory-bank/prd/plan.md`
- `memory-bank/prd/login.md`
- `memory-bank/prd/home.md`
- `memory-bank/prd/search-results.md`
- `memory-bank/prd/category.md`
- `memory-bank/prd/product-detail.md`

## 단계별 계획

### 1. PRD 정리

- [x] 제품 전체 PRD의 MVP 범위와 우선순위 정리.
- [x] 로그인 페이지 PRD 작성.
- [x] 홈페이지 PRD 작성.
- [x] 검색 결과 페이지 PRD 작성.
- [x] 카테고리 대분류/소분류 페이지 PRD 작성.
- [x] 상품 상세 페이지 PRD 작성.
- [x] `AGENTS.md`의 PRD 참조 경로를 `memory-bank/prd/*.md` 구조로 갱신.
- [x] PRD 파일명에서 중복 접두사 `prd-` 제거.

### 2. 정보 구조 및 라우팅 설계

- [x] 페이지별 라우트 구조 결정: `/`, `/categories/[categoryId]`(검색 `?q=...` 포함), `/cards/[cardId]`, `/login`. `/search`는 폐기.
- [x] 홈 화면에서 사용할 1차 링크 타깃 정의: 검색 `/categories/pokemon?q=...`, 카테고리 `/categories/[categoryId]`, 카드 상세 `/cards/[cardId]`.
- [x] 공통 헤더/검색 진입 UX 정의: 홈 검색 폼을 `HomeSearchForm`으로 분리하고 헤더 변형(`size='header'`)을 재사용.
- [x] 카테고리 URL 구조 결정: `/categories/[categoryId]`.
- [x] 상품 상세 URL 구조 결정: `/cards/[cardId]`.

### 3. 데이터 모델 설계

- 영향 파일: `memory-bank/db-schema.md`, `memory-bank/implementation-plan.md`, `memory-bank/architecture.md`, `memory-bank/progress.md`.
- 최소 변경 범위: MVP P0/P1에 필요한 카드 탐색, 검색, 상품 상세 가격 차트, Supabase Auth 기반 관심 카드 저장을 지원하는 Supabase Postgres 스키마를 문서로 확정한다. 상세 설계는 `memory-bank/db-schema.md`를 단일 출처로 두고, 실제 Supabase 적용 상태는 3.1 단계에 기록한다.
- [x] 카드 기본 정보 모델 정의.
- [x] 가격 요약/가격 히스토리 모델 정의.
- [x] 카테고리 모델 정의.
- [x] 관심 카드 모델 정의.

상세 스키마: `memory-bank/db-schema.md`

### 3.1 Supabase DB 스키마 적용

- 영향 파일: `memory-bank/db-schema.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `memory-bank/db-schema.md` 기준 MVP 7개 테이블, FK, unique/index, `updated_at` trigger, RLS 정책을 Supabase MCP migration으로 적용한다.
- [x] `create_tcg_mvp_schema` migration으로 `tcg_games`, `card_sets`, `cards`, `card_categories`, `card_category_links`, `card_price_snapshots`, `favorite_cards` 생성.
- [x] 공개 읽기 테이블과 사용자별 `favorite_cards` RLS 정책 적용.
- [x] Supabase Performance Advisor 경고에 따라 `favorite_cards` RLS의 `auth.uid()` 호출을 `(select auth.uid())` 형태로 최적화.
- [x] Supabase MCP로 테이블, RLS, 정책, 인덱스, 트리거, migration 기록 확인.

### 3.2 포켓몬 가격 데이터 수집 모델 확장

- 영향 파일: `memory-bank/db-schema.md`, `memory-bank/prd/plan.md`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: 포켓몬 MVP 가격 기준을 실거래가 중심으로 확정하고, 기존 대표 `cards` 모델은 유지하되 언어판/지역판/세트/번호/상태/호일/그레이딩별 상품 단위인 `card_printings`를 추가한다. 가격은 source별 원천 관측치(`price_observations`)를 저장한 뒤, 검증/이상치 제거 후 `card_price_snapshots`에 일별 집계한다. Supabase 스키마 변경은 MCP migration으로만 적용한다.
- [x] 카드 데이터 소스 결정을 PRD와 의사결정 로그에 반영.
- [x] `card_printings` 테이블 설계와 Supabase migration 적용.
- [x] `card_price_snapshots`를 `card_printing_id` 기준으로 확장하고 `market`, `variant` 축을 추가.
- [x] `price_observations` 원천 실거래 테이블 추가.
- [x] source별 수집 실패/성공을 기록할 실행 로그 테이블 추가.
- [x] RLS, 인덱스, FK, migration 기록을 Supabase MCP로 검증.

### 3.3 한국판 포켓몬 가격 source 검증

- 영향 파일: `memory-bank/prd/plan.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/trouble-shooting.md`.
- 최소 변경 범위: 한국판 포켓몬 카드 시세 수집은 자동 crawler 구현 전에 source별 실거래성, ToS/접근 가능성, 카드 식별 정확도, 표본 수를 검증한다. MVP 자동화 전에는 인기 한국판 카드 10장을 수동 import 후보로 삼아 `price_observations`에 맞는 데이터 형태를 확인한다. 코드 구현은 source 검증표와 수동 import CSV 계약을 확정한 뒤 진행한다.
- [x] source 평가 기준과 후보군을 문서화.
- [x] 한국판 포켓몬 인기/대표 카드 10장 검증 샘플 목록 확정.
- [x] source별 ToS/API/파트너 접근 가능 여부 1차 확인.
- [x] 수동 import CSV 컬럼 계약을 `price_observations` 필드 기준으로 정의.
- [x] `KR-004` 리자몽 ex 151 SAR의 1차 source별 수동 표본을 `memory-bank/price-source-validation.csv`에 기록.
- [x] 남은 9장에 대해 eBay sold 1차 공개 표본을 `memory-bank/price-source-validation.csv`에 추가 기록.
- [x] `KR-001`, `KR-008`, `KR-009`의 부족 raw sold 표본을 eBay/국내 수동 source로 보강.
- [x] `KR-002` M리자몽 EX 104/100의 추가 raw sold 표본 확보.
- [x] 수동 import 샘플 데이터로 matching rule과 이상치 제거 기준 검증.
- [x] 검증 결과를 바탕으로 1차 자동 adapter 대상 source 결정.

### 3.4 `ebay_sold` adapter 구현 준비

- 영향 파일: `lib/**`, `app/**` 또는 후속 수집 작업 위치, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/trouble-shooting.md`.
- 최소 변경 범위: 1차 자동 adapter source는 `ebay_sold`로 결정하되, eBay Marketplace Insights API가 restricted/limited release이므로 production adapter 구현은 eBay Buy API/Marketplace Insights production access와 API License Agreement 준수 조건을 확인한 뒤 진행한다. 승인 전에는 eBay 페이지 scraping adapter를 만들지 않고, 수동 검증 CSV와 sandbox/API 계약 설계만 허용한다.
- [ ] eBay Developer 계정, Buy API production access, Marketplace Insights access 가능 여부 확인.
- [ ] API License Agreement 기준 데이터 저장/표시/집계 범위를 검토하고, raw eBay content와 공개 snapshot 표시 계약을 분리한다.
- [ ] `ebay_sold` adapter 입력 계약 확정: keyword/category/date window/condition filters, card_printing 매칭 필드, 단일 카드 판정 규칙.
- [ ] `lastSoldDate`, `lastSoldPrice`, `totalSoldQuantity`, condition, item/itemSales ID, item URL, seller/user 관련 필드 저장 최소화 정책 확정.
- [ ] 승인 후 `price_observations` import adapter와 collection run logging 구현.

### 4. UI 구현

- 영향 파일: `app/page.tsx`, `app/search/page.tsx`, `app/categories/[categoryId]/page.tsx`, `app/cards/[cardId]/page.tsx`, `app/login/page.tsx`, `app/globals.css`, `app/layout.tsx`, `components/tcg/HomeSearchForm.tsx`, `components/tcg/HomeSearchForm.test.tsx`, `lib/tcg-data.ts`.
- 최소 변경 범위: Stitch `TCGround Price Tracker` 화면 구조와 한국어 UI 문구를 우선 기준으로 P0 페이지의 정적 UI를 구현한다. 인증·실데이터 연동은 데이터 모델과 인증 수단 결정 이후 별도 단계로 진행한다.
- [x] Stitch `TCGround Price Tracker` 디자인 시스템 기반 전역 CSS 토큰과 `tcg-*` component utility 구조 수립.
- [x] 홈페이지 검색/카테고리/인기 카드 영역을 `TCGround | Home (Search Optimized)` 기준으로 갱신.
- [x] 검색 결과 목록과 상태 화면 구현 (`TCGround | Search: Charizard` 기반, 빈 검색어 안내 포함).
- [x] 카테고리 탐색 화면 구현 (`/categories/[categoryId]`, `pokemon` 정상 상태와 준비 중 빈 상태).
- [x] 상품 상세 정보와 가격 차트 정적 UI 구현 (`/cards/[cardId]`, 404 분기 포함).
- [x] 로그인 정적 화면 구현 (`/login`, 이메일/비밀번호 폼과 가입/소셜 진입 링크).
- [ ] 로그인 입력 검증, 요청 중 상태, 실패 메시지, 성공 후 이동 동작 구현.

### 4.1 Supabase 인증 기반 설정

- 영향 파일: `package.json`, `pnpm-lock.yaml`, `.env.local`, shadcn Supabase 클라이언트 생성 파일, `memory-bank/prd/plan.md`, `memory-bank/prd/login.md`, `memory-bank/architecture.md`, `memory-bank/progress.md`.
- 최소 변경 범위: Supabase Auth를 로그인 구현 기준으로 확정하고, Next.js용 Supabase 패키지와 shadcn Supabase 클라이언트 유틸을 설치한다. 실제 로그인 액션 연결은 별도 작업으로 진행한다.
- [x] 인증 수단을 Supabase Auth로 결정하고 PRD/진행 로그에 반영.
- [x] `@supabase/supabase-js`, `@supabase/ssr` 설치.
- [x] shadcn Supabase Next.js 클라이언트 컴포넌트 추가.
- [x] `.env.local`에 Supabase 공개 URL/Publishable Key 설정.

### 4.2 로그인 Supabase Auth 연결

- 영향 파일: `app/login/page.tsx`, `app/login/_actions/login.ts`, `app/login/_lib/login-utils.ts`, `components/tcg/LoginForm.tsx`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `proxy.ts`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `/login` 정적 폼을 Supabase Auth 이메일/비밀번호 로그인으로 연결한다. 입력 검증, 요청 중 상태, 실패 메시지, 성공 후 이동을 구현하고, 세션 쿠키 갱신은 Supabase SSR 권장 proxy 패턴으로 연결한다. 회원가입, 비밀번호 찾기, Google 로그인은 이번 P0 범위에서 구현하지 않는다.
- [x] 로그인 폼을 서버 컴포넌트 페이지와 클라이언트 `LoginForm`으로 분리.
- [x] 서버 액션에서 이메일/비밀번호 필수 검증과 이메일 형식 검증 수행.
- [x] `supabase.auth.signInWithPassword` 실패 시 한국어 에러 메시지 반환.
- [x] 로그인 요청 중 버튼 비활성화와 로딩 라벨 표시.
- [x] 로그인 성공 시 내부 `next` 경로 또는 `/`로 리다이렉트.
- [x] 이미 로그인된 사용자가 `/login`에 접근하면 내부 `next` 경로 또는 `/`로 이동.
- [x] 외부 URL 또는 비정상 `next` 값은 `/`로 fallback.
- [x] 루트 `proxy.ts`를 추가해 Supabase 세션 쿠키 갱신 연결.
- [x] 로그인 검증/실패/성공/리다이렉트 단위 테스트 추가.

### 4.3 회원가입 Supabase Auth 연결

- 영향 파일: `app/signup/page.tsx`, `app/signup/_actions/signup.ts`, `app/signup/_lib/signup-utils.ts`, `components/tcg/SignupForm.tsx`, `app/auth/confirm/route.ts`, `lib/auth/redirect.ts`, `app/login/page.tsx`, `app/login/_lib/login-utils.ts`, `memory-bank/prd/plan.md`, `memory-bank/prd/login.md`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `/signup` 라우트를 추가하고 이메일/비밀번호 회원가입을 Supabase Auth `signUp`에 연결한다. 가입 성공 시 즉시 로그인하지 않고 인증 메일 확인 안내를 표시하며, Supabase 이메일 확인 링크는 `/auth/confirm` route handler에서 `verifyOtp`로 처리한다. 이름, 닉네임, 프로필 테이블, 약관 체크박스, 소셜 회원가입은 이번 MVP 범위에서 제외한다.
- [x] `/signup` 페이지와 `SignupForm` 클라이언트 폼 추가.
- [x] 서버 액션에서 이메일, 비밀번호, 비밀번호 확인 검증 후 `supabase.auth.signUp` 호출.
- [x] 가입 성공 시 인증 메일 확인 안내와 `/login` 이동 링크 표시.
- [x] 이미 로그인된 사용자의 `/signup` 접근은 안전한 내부 `next` 또는 `/`로 이동.
- [x] 외부 URL, protocol-relative URL, `/signup`, `/login` 같은 비정상 `next` 값은 `/`로 fallback.
- [x] `/auth/confirm` route handler에서 `token_hash`, `type`, optional `next`를 받아 `verifyOtp` 후 안전한 내부 경로로 이동.
- [x] 회원가입 입력 검증, Supabase 실패, 성공, 인증 링크 처리 단위 테스트 추가.

### 4.4 인증 상태 기반 공개 헤더와 로그아웃

- 영향 파일: `components/tcg/PublicHeader.tsx`, `components/tcg/logout-action.ts`, `app/page.tsx`, `app/search/page.tsx`, `app/categories/[categoryId]/page.tsx`, `app/cards/[cardId]/page.tsx`, `memory-bank/prd/login.md`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: 기존 공개 페이지의 중복 헤더를 서버 컴포넌트 `PublicHeader`로 대체한다. 헤더는 Supabase Auth `getClaims()`로 로그인 여부를 판별하고, 비로그인 사용자는 `로그인`/`가입하기`, 로그인 사용자는 `로그아웃`만 표시한다. 로그아웃은 서버 액션에서 `supabase.auth.signOut()`을 호출한 뒤 `/`로 이동한다.
- [x] 홈, 검색 결과, 카테고리, 상품 상세 페이지의 중복 헤더를 `PublicHeader`로 교체.
- [x] 페이지별 기존 검색창 동작 유지: 홈 없음, 검색 결과 `initialQuery`/clear, 카테고리·상품 상세 데스크톱 검색창.
- [x] 비로그인 헤더 링크에 안전한 내부 `next` 보존. 루트(`/`)는 쿼리 없이 `/login`, `/signup` 유지.
- [x] 로그인 상태 헤더는 `로그아웃` 버튼만 렌더링.
- [x] 로그아웃 서버 액션은 Supabase Auth sign-out 후 성공/실패와 관계없이 `/`로 리다이렉트.
- [x] 헤더 인증 상태, 안전한 auth 링크, 로그아웃 액션 단위 테스트 추가.

### 4.5 Next.js project-structure 기준 인증 route 내부 구조 정리

- 영향 파일: `app/login/**`, `app/signup/**`, `components/tcg/LoginForm.tsx`, `components/tcg/SignupForm.tsx`, `memory-bank/architecture.md`, `memory-bank/conventions.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `src/` 폴더 도입 없이 `app/login`과 `app/signup` route segment 안의 route 전용 서버 액션/유틸만 `_actions`, `_lib` private folder로 이동한다. 로그인/회원가입 동작, 검증 문구, Supabase Auth 흐름은 변경하지 않는다.
- [x] `app/login/page.tsx`만 공개 route 파일로 남기고 로그인 action/util과 테스트를 `_actions`, `_lib`로 이동.
- [x] `app/signup/page.tsx`만 공개 route 파일로 남기고 회원가입 action/util과 테스트를 `_actions`, `_lib`로 이동.
- [x] `LoginForm`, `SignupForm`, page, action test, util test import 경로 갱신.
- [x] `app/auth/confirm/route.ts`와 `route.test.ts`는 route handler와 테스트 co-location으로 유지.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.

### 4.6 Storybook 컴포넌트 라이브러리 문서화

- 영향 파일: `package.json`, `pnpm-lock.yaml`, `.gitignore`, `.storybook/**`, `components/**/*.stories.tsx`, `memory-bank/architecture.md`, `memory-bank/progress.md`.
- 최소 변경 범위: Storybook을 내부 개발/문서화 도구로 도입하고, `components/ui/*` 전체와 `components/tcg/*` 도메인 컴포넌트의 주요 상태를 카탈로그화한다. 제품 기능 변경이나 외부 배포/Chromatic 연동은 이번 범위에 포함하지 않는다. `components/tcg/*` 도메인 컴포넌트 스토리와 Storybook MCP 도입은 다음 단계로 미룬다.
- [x] Storybook Next.js 설정과 preview global CSS/provider 구성 추가 (`@storybook/nextjs-vite`, `app/globals.css`, `TooltipProvider`).
- [x] `components/ui/*` shadcn 컴포넌트 전체(24개) 스토리 작성.
- [ ] `components/tcg/*` 도메인 컴포넌트 스토리 작성. (후속)
- [x] `pnpm storybook`, `pnpm build-storybook` 실행 스크립트 추가.
- [ ] Storybook 기본 카탈로그 구축 후, AI 에이전트가 실제 stories/docs를 참조할 수 있도록 Storybook MCP(`@storybook/addon-mcp`) 도입 여부를 검토한다. (후속)
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build-storybook` 검증.

### 4.7 MVP 헤더 메뉴 정리와 목록 라우트 추가

- 영향 파일: `components/tcg/PublicHeader.tsx`, `components/tcg/PublicHeader.test.tsx`, `app/categories/page.tsx`, `app/categories/page.test.tsx`, `app/cards/page.tsx`, `app/cards/page.test.tsx`, `lib/tcg-data.ts`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/architecture.md`.
- 최소 변경 범위: MVP 공개 헤더 메뉴를 실제 사용자 행동과 라우트 구조에 맞춰 `홈 / 검색 / 카테고리 / 인기`로 정리한다. 헤더 링크가 깨지지 않도록 `/categories` 대분류 목록 페이지와 `/cards` 인기 카드 목록 페이지를 정적/seed 기반 최소 UI로 추가한다. 실제 Supabase 조회 전환은 후속 데이터 연동 단계로 유지한다.
- [x] 헤더 메뉴 라벨과 href를 `홈`(`/`), `검색`(`/search`), `카테고리`(`/categories`), `인기`(`/cards`)로 변경.
- [x] `/categories`에서 포켓몬, 매직 더 개더링, 유희왕, 원피스 대분류 링크 렌더링.
- [x] `/cards`에서 정적/seed 기반 인기 카드 목록과 빈 상태 렌더링.
- [x] `PublicHeader`, `/categories`, `/cards` 단위 테스트 추가 또는 갱신.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run` 검증.

### 4.8 components/tcg 도메인 폴더 분리

- 영향 파일: `components/tcg/**`, `app/page.tsx`, `app/search/page.tsx`, `app/categories/page.tsx`, `app/categories/[categoryId]/page.tsx`, `app/cards/page.tsx`, `app/cards/[cardId]/page.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `components/tcg/` 평탄 구조를 기능 도메인별 `auth/`, `layout/`, `search/` 하위 폴더로 이동하고 import 경로만 갱신한다. 동작·UI·테스트 케이스 변경 없음. 빈 `components/home/` 디렉터리는 제거한다.
- [x] `LoginForm`, `SignupForm`, `logout-action(+test)`을 `components/tcg/auth/`로 이동.
- [x] `PublicHeader(+test)`를 `components/tcg/layout/`으로 이동.
- [x] `HomeSearchForm(+test)`을 `components/tcg/search/`로 이동.
- [x] `app/**` 9개 페이지의 `@/components/tcg/...` import 경로 갱신.
- [x] `PublicHeader` 내부 cross-domain import를 `@/components/tcg/<sub>/...` 절대 경로로 갱신.
- [x] 빈 `components/home/` 디렉터리 제거.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.

### 4.9 포켓몬 카탈로그 seed 및 카테고리/상세 DB 전환

- 영향 파일: `lib/tcg-catalog.ts`, `lib/tcg-catalog.test.ts`, `app/categories/[categoryId]/page.tsx`, `app/cards/[cardId]/page.tsx`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, Supabase MCP migration 기록.
- 최소 변경 범위: `memory-bank/price-source-validation.csv`의 `KR-001`~`KR-010` 한국판 포켓몬 대표 카드 10장을 Supabase 공개 카탈로그 테이블에 seed한다. `/categories/pokemon`과 `/cards/[cardId]`만 DB 조회로 전환하고, 다른 카테고리는 기존 준비 중 상태를 유지한다. 가격 snapshot은 아직 seed하지 않고, UI view model에서 deterministic placeholder 가격만 표시한다.
- [x] Supabase MCP migration으로 `pokemon` 게임, 한국판 seed 세트, 카드 10개, printing 10개, 탐색 카테고리와 링크를 upsert.
- [x] Supabase MCP로 `tcg_games.slug = 'pokemon'`, `cards` 10개, `card_printings` 10개, 카테고리 링크를 row count 검증.
- [x] `lib/tcg-catalog.ts`에 포켓몬 카테고리 목록/상세 조회와 가격 placeholder view model 추가.
- [x] `/categories/pokemon`을 DB 목록 렌더링으로 전환하고 카드가 없을 때 “등록된 카드가 없습니다” 상태 표시.
- [x] `/cards/[cardId]`를 Supabase 상세 조회로 전환하고 없는 slug는 404 처리.
- [x] 목록/상세 view model 테스트와 404 테스트 추가.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.

### 4.10 포켓몬 이미지 enrichment

- 영향 파일: `lib/tcg-catalog.ts`, `lib/tcg-catalog.test.ts`, `app/categories/[categoryId]/page.tsx`, `app/cards/[cardId]/page.tsx`, `next.config.ts`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/trouble-shooting.md`, Supabase MCP migration 기록.
- 최소 변경 범위: TCGdex REST API를 1차 이미지 출처로 사용해 seed 카드 10장을 `set_code + collector_number + name` 기준으로 매칭한다. 매칭 성공 시 `card_printings.image_url`에는 상세용 `high.webp`, `cards.thumbnail_url`에는 목록용 `low.webp`, `cards.image_url`에는 상세 fallback용 `high.webp`를 저장하고, `card_printings.external_ids`에 `tcgdex_id`, `image_source='tcgdex'`를 추가한다. 미매칭 카드는 placeholder를 유지하고 실패 사유를 trouble-shooting에 기록한다.
- [x] Supabase MCP로 현재 seed 카드 10장의 `set_code`, `collector_number`, `name`, 이미지 URL 상태를 조회.
- [x] TCGdex REST API 매칭 결과와 이미지 URL 후보를 검증.
- [x] Supabase MCP migration으로 매칭 성공 카드의 image URL과 `external_ids`를 보강.
- [x] Supabase MCP 조회로 이미지 URL 채움 수와 미매칭 수를 검증.
- [x] 목록/상세 view model 이미지 fallback 우선순위 테스트 추가.
- [x] 필요 시 `assets.tcgdex.net` 외부 이미지 설정 추가. 현재 UI는 `<img>`를 직접 사용하므로 Next Image remote config 변경은 필요 없다.
- [x] `/categories/pokemon`, `/cards/kr-004-charizard-ex-151`에서 실제 이미지 또는 placeholder fallback 렌더를 확인.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, 필요 시 `pnpm build` 검증.

### 4.11 검색 라우트를 카테고리 페이지로 흡수

- 영향 파일: `app/search/page.tsx`(삭제), `app/categories/[categoryId]/page.tsx`, `app/categories/[categoryId]/page.test.tsx`, `app/categories/page.tsx`, `app/cards/page.tsx`, `app/cards/page.test.tsx`, `components/tcg/layout/PublicHeader.tsx`, `components/tcg/layout/PublicHeader.test.tsx`, `components/tcg/search/HomeSearchForm.tsx`, `components/tcg/search/HomeSearchForm.test.tsx`, `lib/tcg-catalog.ts`, `lib/tcg-catalog.test.ts`, `memory-bank/architecture.md`, `memory-bank/prd/plan.md`, `memory-bank/prd/search-results.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `/search` 라우트와 mock 데이터를 폐기하고, 카드 이름 검색을 `/categories/[categoryId]?q=...`로 흡수한다. `getPokemonCategoryPageData`에 `query` 옵션을 추가해 Supabase `cards.name`에 `ilike '%q%'` 필터를 적용하고, 페이지는 `q`가 있을 때 결과 인디케이터를 노출하고 등록 세트 그리드를 숨긴다. 헤더 NAV에서 `검색` 메뉴를 제거하고, 헤더/홈 검색은 `/categories/pokemon?q=...`로 이동한다. 다중 TCG 확장 시 기본 카테고리/검색 진입을 재검토한다.
- [x] `lib/tcg-catalog.ts`에 `query` 옵션 추가, `PokemonCategoryPageData.query` 노출, `mapPokemonCategoryPageData` 시그니처 갱신.
- [x] `app/categories/[categoryId]/page.tsx`가 `searchParams.q`를 파싱하고 `PublicHeader.initialQuery`로 전달.
- [x] `q`가 있을 때 등록 세트 그리드 숨김과 검색 결과 인디케이터 표시.
- [x] `app/search/page.tsx` 삭제 및 빈 디렉터리 정리.
- [x] `HomeSearchForm` 리다이렉트 URL을 `/categories/pokemon?q=...`로 변경.
- [x] `PublicHeader` NAV_ITEMS에서 `검색` 항목 제거.
- [x] `/categories`, `/cards`의 `/search` 인바운드 링크 정리.
- [x] `PublicHeader`, `HomeSearchForm`, `app/categories/[categoryId]`, `lib/tcg-catalog`, `app/cards` 테스트 갱신/추가.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.

### 4.12 홈/인기 카드 런타임 fallback

- 영향 파일: `app/page.tsx`, `app/cards/page.tsx`, `eslint.config.mjs`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/trouble-shooting.md`.
- 최소 변경 범위: Supabase 카탈로그 조회 실패가 `/`와 `/cards` 전체 500으로 번지지 않도록 인기 카드 영역만 빈 상태로 fallback한다. Storybook 정적 산출물은 생성 파일이므로 ESLint 검사 대상에서 제외한다.
- [x] `/`의 인기 카드 조회 실패를 `console.error` 기록 후 빈 목록으로 fallback.
- [x] `/cards`의 인기 카드 조회 실패를 `console.error` 기록 후 기존 빈 상태 UI로 fallback.
- [x] `storybook-static/**`를 ESLint global ignore에 추가.
- [x] `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build` 검증.
- [x] `next start -p 3007` 기준 `/`, `/cards` 200 응답 확인.

### 4.13 배포 이미지 전송량 최적화

- 영향 파일: `next.config.ts`, `app/page.tsx`, `app/categories/[categoryId]/page.tsx`, `app/cards/page.tsx`, `app/cards/[cardId]/page.tsx`, `lib/tcg-catalog.ts`, `lib/tcg-catalog.test.ts`, `app/cards/page.test.tsx`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/trouble-shooting.md`.
- 최소 변경 범위: 외부 카드/카테고리 이미지를 직접 원본 크기로 전송하지 않고 `next/image` 최적화 경로를 사용한다. 목록/홈/인기 카드 view model은 `thumbnail_url`을 우선 사용하고, 상세 이미지만 `card_printings.image_url`의 고해상도 이미지를 우선한다.
- [x] `next.config.ts`에 `assets.tcgdex.net`, `lh3.googleusercontent.com` remote image pattern과 크기 후보 설정 추가.
- [x] 홈 카테고리 타일, 홈 인기 카드, 카테고리 카드, 인기 카드 목록, 상품 상세 카드 이미지를 `next/image`로 전환.
- [x] 목록/홈/인기 카드 이미지 fallback 우선순위를 `thumbnail_url` → `card_printings.image_url` → `cards.image_url`로 변경.
- [x] 관련 이미지 우선순위/Next 최적화 URL 테스트 갱신.
- [x] `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build` 검증.
- [x] `next start -p 3002` 기준 `/`, `/cards`, `/categories/pokemon`, `/cards/kr-004-charizard-ex-151` 응답과 `/_next/image` URL 렌더 확인.

### 5. 품질 게이트이

- [x] `pnpm lint`
- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm test --run`
- [x] `pnpm build`

## 다음 작업

포켓몬 카탈로그 seed와 `/categories/pokemon`, `/cards/[cardId]` DB 전환, TCGdex 기반 이미지 enrichment를 완료했다. TCGdex 한국어 endpoint는 seed secret rare 이미지를 제공하지 않아, SV/SV2a/SV3/SV8a 8장은 TCGdex 일본어 equivalent set/localId 이미지로 보강했고, CP6 20th Anniversary `KR-001`, `KR-002`는 placeholder를 유지한다. 다음 작업은 eBay Buy API/Marketplace Insights production access와 API License Agreement 준수 범위를 확인한 뒤 adapter 계약을 확정하는 것이다. 승인 전에는 eBay 페이지 scraping adapter를 만들지 않고, 국내 source는 수동 import source로 유지한다. `confidence_score < 0.8`, damaged/played, `clean_raw` 표본 3개 미만 행은 snapshot 집계에서 보류한다.
