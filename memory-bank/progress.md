# PROGRESS

> 작업 진행 상황과 의사결정 로그.
> 마지막 갱신: 2026-05-20

## 현재 작업

- 2026-05-20: 다음 작업은 Supabase MCP 또는 migration으로 MVP DB 스키마(`tcg_games`, `card_sets`, `cards`, `card_categories`, `card_category_links`, `card_price_snapshots`, `favorite_cards`)를 실제 Supabase 프로젝트에 적용하는 것이다.

## 완료 로그

- 2026-05-20: MVP 데이터 모델 상세 설계를 `memory-bank/db-schema.md`로 분리했다. `implementation-plan.md`는 3단계 체크리스트와 참조 링크만 남기고, `architecture.md`는 핵심 데이터 모델과 보안 기준 요약을 유지한다.
- 2026-05-20: MVP 데이터 모델 설계를 완료했다. Supabase Postgres 기준 테이블, 컬럼, 인덱스, 조회 기준, RLS 정책 방향을 문서화했고 `architecture.md`에는 핵심 데이터 모델과 보안 기준을 요약했다.
- 2026-05-20: 사용자가 제공한 Supabase 설정 지시에 따라 인증 수단을 Supabase Auth로 확정하고 `prd/plan.md`, `prd/login.md`, `implementation-plan.md`에 반영했다.
- 2026-05-20: `@supabase/supabase-js`, `@supabase/ssr`를 설치하고 shadcn Supabase Next.js 클라이언트 파일(`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`)을 추가했다. `.env.local`에는 사용자가 제공한 Supabase URL과 publishable key를 설정했다. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`을 통과했다.
- 2026-05-20: `implementation-plan.md`와 `architecture.md`를 실제 라우트/페이지 구현 상태에 맞춰 동기화했다. 카테고리와 상품 상세 정적 UI는 완료로 표시하고, 로그인은 정적 화면 완료와 인증 동작 미완료를 분리했다. 다음 작업을 상품 상세 가격 차트 데이터 모델화로 정리했다.
- 2026-05-08: Stitch `TCGround Price Tracker`의 `TCGround | Card Detail (Updated Nav)` 화면과 `memory-bank/prd/product-detail.md` PRD를 기준으로 상품 상세 페이지(`app/cards/[cardId]/page.tsx`)를 구현했다. 동적 라우트로 `charizard-base-set-1st-edition` 슬러그에 Stitch HTML 기반 헤더(`HomeSearchForm size='header'`), `Base Set로 돌아가기` 단일 back 링크, 2컬럼 디테일(좌측 카드 이미지 / 우측 chip·display 가격·트렌드 칩·최저/최고가·관심 카드/가격 알림 액션·기간 탭이 달린 SVG 가격 차트·데이터 출처·마지막 업데이트), `Base Set의 다른 카드` 4개 columns masonry, 공통 footer를 구성했다. 알 수 없는 슬러그는 `notFound`로 분기한다. UI 라벨은 한국어, 카드명·세트·레어도는 영문 표기 컨벤션을 유지했다. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build`, 변경 파일 Prettier check를 통과했고 dev `http://localhost:3000/cards/charizard-base-set-1st-edition`에서 키 섹션 렌더(평균 거래가, 관심 카드 추가, 가격 변동(90일), Base Set의 다른 카드 등)와 `/cards/unknown-card` 404 응답을 확인했다.
- 2026-05-08: Stitch `TCGround Price Tracker`의 `TCGround | Category: Pokemon (Updated Nav)` 화면을 기준으로 카테고리 페이지(`app/categories/[categoryId]/page.tsx`)를 구현했다. 동적 라우트로 `pokemon` 슬러그에는 Stitch HTML을 따라 헤더(`HomeSearchForm size='header'`), Home > Categories > 포켓몬 breadcrumb, 한국어 hero, 사이드바(레어도 체크박스 / 시대 라디오), 5개 인기 세트 bento, 5개 인기 카드 columns masonry, footer를 구성했다. 알 수 없는 슬러그는 `notFound`로 분기하거나 `KNOWN_CATEGORY_LABELS`(magic, yugioh, one-piece)에 한해 "준비 중" 빈 상태를 노출한다. 카드 식별자는 영문, UI 라벨은 한국어 컨벤션을 따랐다. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build`, 변경 파일 Prettier check를 통과했고 dev `http://localhost:3050/categories/pokemon`과 `/categories/yugioh`에서 정상 상태와 빈 상태 렌더를 확인했다.
- 2026-05-08: Stitch `TCGround Price Tracker`의 `TCGround | Search: Charizard` 화면을 기준으로 검색 결과 페이지(`app/search/page.tsx`)를 구현했다. 헤더에는 prefilled 검색 입력(`HomeSearchForm size='header' showClearButton initialQuery=...`)을 두고, 정렬·필터 칩 스트립과 결과 카운트, 6개 정적 카드의 columns 기반 masonry, 빈 검색어 안내 상태를 구성했다. `HomeSearchForm`에 `initialQuery`/`showClearButton`/`size='header'` 변형을 추가하고 단위 테스트를 두 건 추가했다. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build`, 변경 파일 Prettier check를 통과했고 dev `http://localhost:3000/search?q=Charizard`와 `/search`에서 결과/빈 상태 렌더를 확인했다.
- 2026-05-08: Stitch `TCGround Price Tracker`의 `TCGround | Home (Search Optimized)` 화면을 기준으로 홈페이지 UI를 갱신했다. 히어로에 큰 한국어 검색 폼과 명시적 `검색` 버튼을 추가하고, 상단 내비게이션/카테고리/인기 카드/CTA/footer 문구를 대상 화면에 맞춰 한국어화했다. 검색은 빈 검색어를 막고 `/search?q=...`로 이동하는 기존 요구사항을 유지했다. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build`, 대상 파일 Prettier check를 통과했고, 기존 dev 서버 `http://localhost:3000`의 HTML 응답에서 핵심 섹션 렌더를 확인했다.
- 2026-05-08: Stitch `TCGround Price Tracker`의 `TCGround | Home` 화면을 기준으로 홈페이지 UI를 재구현했다. 상단 내비게이션, pill 검색창, `Collect with Confidence` 히어로, 4개 카테고리 타일, masonry `Trending Now`, CTA, footer를 Stitch HTML 구조와 문구에 맞췄다. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build`를 통과했고 `next start -p 3002`의 HTML 응답에서 핵심 섹션 렌더를 확인했다.
- 2026-05-08: Stitch `TCGround Price Tracker` 디자인 시스템을 `app/globals.css`의 전역 토큰, shadcn semantic token, `tcg-*` component utility 구조로 반영했다. 루트 폰트는 Manrope 기반으로 맞췄고 `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`를 통과했다.
- 2026-05-08: 이전 세션의 TCGround 페이지별 PRD 초안을 `memory-bank/prd/*.md` 구조로 정리했다. 제품 전체 PRD의 MVP 범위도 로그인, 홈, 검색 결과, 카테고리, 상품 상세 중심으로 갱신했다.
- 2026-05-08: `AGENTS.md`의 PRD 참조 경로를 `memory-bank/prd-*.md`에서 `memory-bank/prd/*.md` 구조로 갱신했다.
- 2026-05-08: `memory-bank/prd/` 디렉터리 안의 PRD 파일명에서 중복 접두사 `prd-`를 제거하고 `AGENTS.md`와 실행 계획의 참조를 갱신했다.

## 의사결정 로그

- 2026-05-20: MVP DB는 `tcg_games`, `card_sets`, `cards`, `card_categories`, `card_category_links`, `card_price_snapshots`, `favorite_cards` 7개 테이블로 시작한다. 가격 요약은 별도 테이블로 중복 저장하지 않고 최신 `card_price_snapshots` 조회를 기준으로 하며, 성능 문제가 생기면 `card_price_summaries` view 또는 materialized view로 확장한다.
- 2026-05-20: 인증 수단은 Supabase Auth로 확정한다. 이유는 사용자가 Supabase 프로젝트 URL과 publishable key, `@supabase/supabase-js`, `@supabase/ssr`, shadcn Supabase 클라이언트 설치 지시를 제공했고, 기존 PRD의 인증 수단 미결 항목을 해소하기 때문이다.
- 2026-05-20: 로그인 페이지는 현재 정적 화면 구현 완료로만 간주하고 인증 동작은 별도 작업으로 진행한다. 인증 수단은 Supabase Auth로 확정됐으므로 다음 작업부터 Supabase 클라이언트 기준으로 로그인 요청/세션/리다이렉트 계약을 구현한다.
- 2026-05-08: 검색 결과 페이지 카드 명칭/세트/그레이딩 라벨은 영문 표기를 유지한다. 이유는 홈에서 이미 영문 카드 식별자를 사용 중이고 TCG 업계에서 영문 표기가 검색 매칭의 기준이기 때문이다. UI 라벨(필터, 가격: 높은순, 결과 카운트, 빈 상태 안내)은 한국어로 통일한다.
- 2026-05-08: 홈 UI는 기존 한국어 PRD 재구성안보다 Stitch `TCGround | Home` 및 `TCGround | Home (Search Optimized)` 화면을 우선 기준으로 둔다. 이유는 사용자가 Stitch 화면 1:1 참고를 명시했고, 해당 화면의 실제 레이아웃·문구·이미지가 구현 기준이기 때문이다.
- 2026-05-08: 홈 화면 링크 타깃은 검색 `/search?q=...`, 카테고리 `/categories/[categoryId]`, 카드 상세 `/cards/[cardId]`를 1차 기준으로 둔다. 이유는 PRD의 다음 이동 경로를 실제 라우트 골격과 연결하고, 이후 검색 결과/카테고리/상세 페이지 구현 시 같은 URL 계약을 재사용하기 위해서다.
- 2026-05-08: CSS 구조는 별도 CSS 파일을 늘리지 않고 `app/globals.css` 한 곳에서 Tailwind v4 `@theme inline`, semantic color token, `tcg-*` component utility 레이어로 관리한다. 이유는 shadcn 컴포넌트가 CSS 변수 기반이고, 현재 단계에서는 도메인 화면 공통 패턴을 빠르게 공유하는 것이 우선이기 때문이다.
- 2026-05-08: PRD 파일은 제품 전체 계획 파일(`plan.md`)과 페이지별 파일(`login.md`, `home.md`, `search-results.md`, `category.md`, `product-detail.md`)로 분리한다. 이유는 페이지 단위 구현 시 목표, 사용자 스토리, P0/P1 요구사항을 빠르게 참조하기 위해서다.
