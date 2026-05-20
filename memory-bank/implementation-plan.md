# IMPLEMENTATION PLAN

> PRD를 단계와 작업으로 분해한 실행 계획.
> 마지막 갱신: 2026-05-20

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

- [x] 페이지별 라우트 구조 결정: `/`, `/search`, `/categories/[categoryId]`, `/cards/[cardId]`, `/login`.
- [x] 홈 화면에서 사용할 1차 링크 타깃 정의: 검색 `/search?q=...`, 카테고리 `/categories/[categoryId]`, 카드 상세 `/cards/[cardId]`.
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

### 5. 품질 게이트

- [x] `pnpm lint`
- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm test --run`

## 다음 작업

로그인 화면을 Supabase Auth 클라이언트에 연결하고, 카드/검색/상세 화면은 정적 `lib/tcg-data.ts`에서 Supabase 조회로 전환한다. 데이터 연동 전에는 MVP seed 데이터 입력 전략, 대표 `card_printings` 선택 기준, 포켓몬 카탈로그 import 순서(TCGdex/Pokémon TCG API)를 확정한다.
