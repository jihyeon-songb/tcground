# ARCHITECTURE

> 기술 스택·디렉터리 구조·수정 범위·Next.js/UI 가이드.
> 명명·코딩 스타일·테스트·커밋 룰은 `CONVENTIONS.md`.
> 마지막 갱신: 2026-06-03 (전체 가격 worklist 확장)

## 1. 스택

- Next.js 16 (App Router) · React 19 · TypeScript 5 (strict)
- 모노레포 workspace: 기존 Next 앱 + `packages/ui` 공통 UI 라이브러리 + `apps/docs` Docusaurus 문서 사이트
- Tailwind CSS v4 + `prettier-plugin-tailwindcss`
- shadcn/ui 계열 컴포넌트 + lucide-react + class-variance-authority + tailwind-merge + clsx + cmdk. `@tcground/ui`의 Button, Tabs, Dialog는 Radix primitive 의존 없이 직접 구현한 접근성 primitive이며, 나머지 오버레이/폼 primitive는 아직 Radix 기반 wrapper를 유지한다.
- `packages/ui`: `@tcground/ui` 패키지. 기존 앱의 `components/ui/*` 공통 UI 컴포넌트를 분리한 React 18/19 peer range UI 라이브러리. npm 공개 배포를 위해 `private: false`, public `publishConfig`, README, package metadata를 갖추며, `@tcground/ui/theme.css`는 빌드 후 `dist/theme.css`를 export한다. 루트 `tcground` 앱은 npm registry에 배포된 `@tcground/ui` semver 버전을 소비하고, `apps/docs`는 문서/개발 검증을 위해 workspace 패키지를 소비한다.
- `apps/docs`: Docusaurus 3.9.2 classic preset. 최신 Docusaurus next 문서는 Node 24를 요구하므로 현재 Node 22 환경에서는 3.9.2를 고정한다. 컴포넌트 문서는 `apps/docs/docs/components/*.mdx`, preview 예제는 `apps/docs/src/components/examples/<component>/*`에 둔다.
- Supabase JS + Supabase SSR (Auth/서버 클라이언트)
- Vitest 4 + Testing Library + jsdom
- ESLint 9 (`next/core-web-vitals` + `next/typescript`)
- Storybook 10 (`@storybook/nextjs-vite`) — UI 컴포넌트 카탈로그/문서화 도구
- pnpm workspace

전제: Node 20+, pnpm.

## 2. 디렉터리 구조

```
.storybook/          # Storybook 설정 (`main.ts`, `preview.tsx`)
app/                 # Next.js App Router (페이지·layout·route handler)
  layout.tsx         # 루트 레이아웃 + TooltipProvider
  page.tsx           # 홈
  categories/page.tsx # TCG 대분류 목록
  categories/[categoryId]/page.tsx # 카테고리 탐색 + 카드 이름 검색(`?q=`)
  cards/page.tsx      # 인기 카드 목록
  cards/[cardId]/page.tsx          # 상품 상세
  login/page.tsx     # 로그인
  login/_actions/login.ts       # 로그인 route 전용 서버 액션
  login/_lib/login-utils.ts     # 로그인 route 전용 유틸
  signup/page.tsx    # 회원가입
  signup/_actions/signup.ts     # 회원가입 route 전용 서버 액션
  signup/_lib/signup-utils.ts   # 회원가입 route 전용 유틸
  auth/confirm/route.ts # Supabase 이메일 인증 콜백
  globals.css        # Tailwind 엔트리 + CSS 변수 / 디자인 토큰
proxy.ts             # Supabase SSR 세션 쿠키 갱신
components/
  tcg/               # TCGround 도메인 컴포넌트 (기능 도메인별 하위 폴더)
    auth/            # 로그인/회원가입/로그아웃 폼·서버 액션
    layout/          # 공개 페이지 공통 헤더 등 레이아웃 컴포넌트
    search/          # 검색 입력 컴포넌트
lib/                 # 도메인 정적 데이터·유틸·Supabase 클라이언트
public/              # 정적 자산
docs/                # 본 문서들
packages/ui/         # `@tcground/ui` 공통 UI 컴포넌트 라이브러리
  src/components/ui/ # 기존 앱에서 분리한 shadcn 기반 공통 UI 컴포넌트와 stories
apps/docs/           # Docusaurus 제출/배포용 문서 사이트
  docs/components/   # `@tcground/ui` 컴포넌트별 MDX 문서
  src/components/examples/ # 문서 preview용 컴포넌트별 예제
```

핵심 위치:

- 절대 import 별칭: `@/*` → 프로젝트 루트. 루트 앱의 `@tcground/ui`는 npm 배포본을 가리키며, `apps/docs` 개발 서버/빌드는 Docusaurus resolve plugin과 workspace dependency로 `packages/ui/src`를 참조한다.
- 공통 UI 부품: `packages/ui/src/components/ui/*` (`@tcground/ui`). 도메인 컴포넌트는 `components/<domain>/<sub-domain>/*`로 기능 단위로 묶는다.
- 기존 `components/ui/*`는 `packages/ui/src/components/ui/*`로 이동했다. 앱 도메인 컴포넌트는 필요 시 `@tcground/ui`를 소비한다.
- `packages/ui/src/components/ui/primitive.tsx`는 직접 구현 primitive에서 공유하는 ref 병합, event handler 병합, `asChild` slot 병합 헬퍼를 제공한다. Button은 이 헬퍼로 Radix `Slot` 의존 없이 `asChild`와 disabled semantics를 처리한다. Tabs는 자체 context로 tablist/tab/tabpanel ARIA, roving tabindex, 방향키 이동을 관리한다. Dialog는 자체 portal, body sibling `aria-hidden`, focus trap, Escape/overlay close, focus restore를 관리한다.
- TCGround 도메인 컴포넌트: `components/tcg/<auth|layout|search>/*`. 새 도메인이 생기면 같은 레벨에 폴더를 추가한다. 같은 하위 폴더 안에서는 상대 import, 다른 하위 폴더는 `@/components/tcg/<sub>/...` 절대 경로를 사용한다.
- 공개 페이지 공통 헤더: `components/tcg/layout/PublicHeader.tsx`. 서버 컴포넌트에서 Supabase Auth `getClaims()`로 인증 상태를 확인하고, 페이지별 검색창 옵션과 현재 내부 경로(`next`)만 props로 받는다.
- 로그인 인증 동작: `app/login/_actions/login.ts` 서버 액션, `app/login/_lib/login-utils.ts` route 전용 유틸, `components/tcg/auth/LoginForm.tsx` 클라이언트 폼을 기준으로 한다.
- 회원가입 인증 동작: `app/signup/_actions/signup.ts` 서버 액션, `app/signup/_lib/signup-utils.ts` route 전용 유틸, `components/tcg/auth/SignupForm.tsx` 클라이언트 폼을 기준으로 한다.
- App Router route segment 안에서 route 전용 지원 파일을 둘 때는 `_actions`, `_lib` 같은 private folder를 사용해 공개 route 파일(`page.tsx`, `route.ts`)과 내부 구현 파일을 구분한다.
- 로그아웃 인증 동작: `components/tcg/auth/logout-action.ts` 서버 액션에서 `supabase.auth.signOut()`을 호출하고 항상 `/`로 이동한다.
- 홈/카테고리 헤더 검색 입력: `components/tcg/search/HomeSearchForm.tsx` 클라이언트 컴포넌트. 제출 시 기본 카테고리 `/categories/pokemon?q=...`로 이동한다. `PublicHeader`가 옵션에 따라 재사용한다.
- 카드 이름 검색은 독립 라우트가 아니라 `/categories/[categoryId]?q=...` 쿼리로 동작한다. `q`가 있으면 `lib/tcg-catalog.ts`의 `getPokemonCategoryPageData`가 Supabase `cards.name`에 `ilike '%q%'` 필터를 적용하고, 페이지는 세트 그리드를 숨긴 채 결과 인디케이터와 매칭 카드 그리드만 노출한다. 헤더 검색창의 `initialQuery`/`showClearButton`은 그대로 유지한다.
- Supabase 이메일 확인 링크는 `app/auth/confirm/route.ts`에서 `token_hash`, `type`, optional `next`를 받아 `verifyOtp`로 처리한다. Confirm signup 이메일 템플릿은 `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`처럼 `token_hash`와 `type`을 `/auth/confirm` 요청에 포함해야 한다.
- 인증 진입점의 `next` 값은 `lib/auth/redirect.ts`에서 내부 경로만 허용하며, 외부 URL, protocol-relative URL, `/login`, `/signup`은 `/`로 fallback한다.
- 대분류 카테고리 목록: `lib/tcg-catalog.ts`의 `getTcgCategoryOverview`. `/categories`는 포켓몬/유희왕/원피스/매직 더 개더링 기본 대분류를 항상 보여주고, Supabase 공개 카탈로그 테이블(`tcg_games`, `cards`, `card_sets`, `card_printings`, `card_price_snapshots`)에서 실제 카드/세트/가격 기록 수를 집계한다. 아직 DB row 또는 데이터가 없는 기본 대분류는 숨기지 않고 0으로 표시한다. 카드/세트 수는 PostgREST row limit에 잘리지 않도록 행 배열 길이가 아니라 게임별 exact count 쿼리(`head: true`, `count: exact`)를 기준으로 한다.
- 정적 카드/검색 보조 데이터: `lib/tcg-data.ts`. `/categories` fake 대분류 숫자는 제거했으며, 홈/인기 목록의 보조 포맷과 기존 정적 featured card 타입 일부만 남아 있다.
- 포켓몬 카탈로그 서버 조회: `lib/tcg-catalog.ts`. Supabase 공개 카탈로그 테이블(`tcg_games`, `card_sets`, `cards`, `card_printings`, `card_categories`, `card_category_links`)에서 `/categories/pokemon`과 `/cards/[cardId]` view model을 만든다. 가격 snapshot이 없을 때는 DB에 가짜 가격을 쓰지 않고 UI view model에서 deterministic 표시값만 만든다. 목록/홈/인기 카드 이미지는 기본 한국판(`ko/KR`) printing을 고른 뒤 한국 포켓몬센터 CDN(`cards.image.pokemonkorea.co.kr`) 이미지를 우선하고, 없을 때 `cards.thumbnail_url`, `card_printings.image_url`, `cards.image_url` 순서로 fallback한다. 상세 페이지는 기본 한국판으로 열며 `edition=kr|jp|na` 쿼리로 한국판/일본판/미국판을 선택한다. 선택 시 해당 `card_printing_id`의 `card_printings.image_url`과 `card_price_snapshots`만 사용해 이미지, 가격 요약, 가격 차트를 만든다.
- Supabase 클라이언트 유틸은 shadcn Supabase Next.js 컴포넌트가 생성하는 파일을 기준으로 사용하고, 세션 쿠키 갱신은 루트 `proxy.ts`에서 `lib/supabase/middleware.ts`를 호출해 처리한다.
- 가격 수집 모듈: `lib/pricing/`. source-agnostic 어댑터 계약(`price-source.types.ts`), 관측치→snapshot 집계(`aggregate.ts`), 수동 CSV import(`csv-import.ts`), 환율 fetch/display 환산(`fx.ts`), eBay 어댑터(`ebay/`)를 둔다. 일일 수집은 `app/api/cron/collect-prices/route.ts`(Vercel Cron, `CRON_SECRET` 검증)가 `lib/pricing/collect-prices.ts`를 호출하고, RLS deny-all인 `price_observations`/`card_price_snapshots`/`price_collection_runs` 쓰기는 service-role 클라이언트(`lib/supabase/admin.ts`)로만 한다. 로컬 검증/수동 sold/asking import와 FX import는 `scripts/collect-prices.ts`. 전체 한국판 카탈로그의 증거 대기 목록 동기화는 `scripts/sync-price-worklist.ts`가 담당하며, CSV `sample_id`는 `PKMKR-<card_num>`으로 통일해 `card_printings.external_ids.card_num`으로 해소한다. 기존 `KR-*` priority 번호는 `raw_payload_json.worklist_id` alias로만 보존한다.
- eBay 가격 source 현실 제약: 실거래가(sold)는 Marketplace Insights API(`buy.marketplace.insights`)로만 얻고 이는 Limited Release라 개인 개발자 승인이 어렵다. `marketplace-insights-adapter.ts`는 매핑/scaffold만 두고 `EBAY_MARKETPLACE_INSIGHTS_ENABLED=true`가 아니면 `EbayAccessNotGrantedError`를 던진다. 일별 시계열은 개인도 쓸 수 있는 Browse API(`browse-adapter.ts`, 판매중 호가) 일일 수집으로 누적하고, 수동 CSV sold 실거래가는 차트 참조점으로 오버레이한다. 카드 상세 차트(`app/cards/[cardId]/page.tsx`)는 `card_price_snapshots`를 읽어 그리며 시장/통화는 섞지 않는다.
- 수동 CSV sold 집계는 source별로 분리해 `card_price_snapshots.source_name`에 `ebay_sold`, `pricecharting_ebay_sold`, `manual_kream`, `manual_bunjang` 같은 원천을 보존한다. `manual_bunjang`처럼 같은 source가 sold/asking 양쪽에 쓰일 수 있으므로 상세 차트는 `source_name`만 보지 않고 `aggregation_method`(`median_filtered` vs `manual_asking_median`/`*_asking_median`)를 우선해 sold/asking을 구분한다. 가격 요약 source label은 snapshot source를 `PriceCharting eBay sold`, `KREAM`, `번개장터` 등 사용자에게 읽히는 이름으로 노출한다.
- 환율/표시 가격: `exchange_rates`는 `base_currency`, `quote_currency`, `rate`, `rate_date`, `provider`, `fetched_at`를 저장한다. `card_price_snapshots.currency`와 `avg_price` 계열은 원천 snapshot 통화/금액을 유지하고, FX migration 적용 후에는 `display_currency`, `display_avg_price`, `display_min_price`, `display_max_price`, `fx_rate_date`, `fx_provider`를 화면 표시 기준으로 사용한다. migration 적용 전 원격 DB에서는 legacy snapshot 조회/upsert fallback이 동작한다.
- 데이터 최소화: eBay/CSV 관측치는 가격·일자·상태·등급·item id/url·축소 `raw_payload`만 저장하고 seller/buyer 식별 정보와 원문 전체 payload는 저장하지 않는다.
- 가격 수집 env(server-only): `SUPABASE_SERVICE_ROLE_KEY`, `KOREA_EXIM_FX_API_KEY`, `EBAY_ENV`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE_INSIGHTS_ENABLED`, `CRON_SECRET`. placeholder는 `.env.example` 참고.
- 디자인 토큰·전역 CSS: `app/globals.css`.
- 외부 이미지는 `next.config.ts`의 `images.remotePatterns`에 허용한 `assets.tcgdex.net`, `cards.image.pokemonkorea.co.kr`, `lh3.googleusercontent.com`, `images.pokemontcg.io`만 `next/image` 최적화 경로로 렌더링한다. 새 외부 이미지 출처를 추가하면 `remotePatterns`와 이미지 fallback 우선순위를 함께 갱신한다.
- 향후 추가 예정 디렉터리: `hooks/`, `types/`.

## 3. 데이터 모델 기준

MVP DB는 Supabase Postgres를 기준으로 한다. 상세 설계는 `memory-bank/db-schema.md`를 단일 출처로 둔다.

핵심 테이블:

- `tcg_games`: TCG 대분류.
- `card_sets`: 세트/확장팩.
- `cards`: 대표 카드 기본 정보와 검색 기준.
- `card_printings`: 언어판/지역판/세트/번호/호일 단위의 실제 가격 대상.
- `card_categories`: 탐색용 카테고리.
- `card_category_links`: 카드-카테고리 연결.
- `price_observations`: source별 실거래 원천 관측치.
- `card_price_snapshots`: `card_printings` 기준 일자별 가격 히스토리와 현재 가격 요약의 원천.
- `exchange_rates`: 외화 원천 가격을 KRW 등 표시 통화로 환산할 때 쓰는 일별 FX rate.
- `price_collection_runs`: source별 가격 수집 실행/실패 로그.
- `favorite_cards`: Supabase Auth 사용자별 관심 카드.

보안 기준:

- 카드/카테고리/printing/snapshot 데이터는 공개 읽기만 허용하고 클라이언트 직접 쓰기는 금지한다.
- 원천 관측치와 수집 실행 로그는 service role 또는 서버 전용 관리 경로에서만 접근한다.
- `favorite_cards`는 RLS로 `auth.uid() = user_id` 행만 사용자별 읽기/쓰기 가능하게 한다.
- 카드/가격 수집·수정은 server/admin 경로 또는 Supabase service role을 사용하는 관리 작업으로만 처리한다.

가격 수집 기준:

- MVP 대상은 포켓몬 우선이다.
- 카드 카탈로그는 TCGdex와 Pokémon TCG API 조합으로 시작한다.
- 가격 기준은 실거래가 관측치이며, 판매중 최저가는 보조 지표로만 둔다.
- daily/manual job은 `price_observations` 저장, 이상치 제거/매칭 검증, `card_price_snapshots` 집계, FX display 가격 부여 순서로 처리한다. 외화 원천 금액은 `price_observations.currency/sold_price`와 snapshot source 필드에 보존하고, UI 비교는 `display_currency` 기준으로 한다.
- 일본/한국 가격 source는 공개 API가 부족할 수 있으므로 수동 import와 ToS가 허용된 source adapter를 분리해 붙인다.
- 한국판 포켓몬의 1차 자동 가격 adapter source는 `ebay_sold`다. 단, production 구현은 eBay Buy API/Marketplace Insights 접근 승인과 API License Agreement 준수 범위 확인 이후에만 진행한다.
- 승인 전에는 eBay web page scraping adapter를 만들지 않고, 수동 CSV import와 adapter contract/sandbox mock 기반 검증만 허용한다.

## 4. 수정 범위

**수정 허용**

- `app/**` — App Router 페이지·레이아웃·route handler
- `components/**` — 도메인 컴포넌트
- `packages/ui/**` — 공통 UI 라이브러리 컴포넌트, stories, 패키지 export
- `lib/**`, `hooks/**`, `types/**` — 유틸·훅·타입 (없으면 생성 가능)
- `public/**` — 정적 자산
- `docs/**` — 본 문서 (작업 완료 후 갱신)
- `*.config.{ts,mjs,js}`, `tsconfig.json`, `.prettierrc` — 변경 시 PR 본문에 사유 명시

**수정 시 주의 (덮어쓰기 위험)**

- `components.json`의 shadcn alias는 `packages/ui/src/components/ui`와 `packages/ui/src/utils`를 가리킨다. shadcn CLI로 공통 UI를 추가할 때는 패키지 경계와 export 갱신 여부를 함께 확인한다.

**수정 금지**

- `node_modules/**`, `.next/**`
- `pnpm-lock.yaml` — 의존성 변경 의도가 없을 때
- `.env*` — 절대 커밋 금지 (`.env.example`만 허용)

## 5. Next.js 가이드

- 기본은 Server Component. 상호작용·브라우저 API·hooks가 필요할 때만 Client Component(`'use client'`).
- 서버 API에는 route handler를 우선 사용한다.
- 모든 사용자 입력은 서버에서 검증한다.
- DB 쓰기는 서버에서만.
- SEO가 중요한 페이지에 `metadata`를 정의한다.
- 민감 로직을 Client Component에 두지 않는다.

## 6. UI 가이드

- Tailwind는 CSS 변수와 `app/globals.css` 토큰을 우선 사용. shadcn 컴포넌트와 일관성 유지.
- Stitch `TCGround Price Tracker` 디자인 시스템의 Manrope, warm-cream surface, Pinterest Red CTA, flat editorial 카드 규칙을 `app/globals.css`의 전역 CSS 변수와 `tcg-*` component utility로 관리한다.
- 앱의 action button은 native `<button>`에 직접 스타일을 쓰지 않고 `@tcground/ui`의 `Button`을 사용한다. `Button`의 기본 variant는 TCG primary CTA(`--tcg-red`/`--tcg-red-dark`)이며 반복 패턴은 `search`, `auth`, `cta`, `tab`, `pill` size로 표현한다.
- 사용자가 특정 Stitch 화면 1:1 구현을 요청한 경우, 해당 Stitch 화면의 실제 HTML 구조·문구·이미지·색상 값을 우선 기준으로 삼고 PRD P0 기능은 그 화면 안에서 가능한 범위로 유지한다.
- 페이지 레이아웃은 `.tcg-page`, `.tcg-shell`, `.tcg-section`을 기본 골격으로 삼고, 카드/검색/칩/가격 표시 같은 반복 패턴은 `.tcg-card-surface`, `.tcg-search-shell`, `.tcg-chip-*`, `.tcg-price`를 우선 사용한다.
- 모바일 → 데스크톱 반응형.
- 버튼·라벨·폼·포커스는 접근성을 기본으로 고려.
- 명시적 요청 없이 새 UI 라이브러리 추가 금지.
- 앱 화면에는 과한 마케팅형 섹션을 피한다. 별도 요청이 없는 한 랜딩보다 실제 제품 화면을 먼저 만든다.

## 7. 예정 인프라

| 영역                  | 후보                                |
| --------------------- | ----------------------------------- |
| 호스팅                | Vercel                              |
| DB                    | Supabase Postgres                   |
| 인증                  | Supabase Auth                       |
| 이미지 저장           | Supabase Storage 또는 Cloudflare R2 |
| 캐시·rate limit·queue | Upstash Redis                       |
| 이메일                | Resend                              |

> 도입 시 시크릿·세션 처리 코드는 코드오너 리뷰 필수.
> 결정 사항은 `PRD.md`의 "결정 대기"와 동기화 유지.

## 8. Storybook

- Framework: `@storybook/nextjs-vite` (Vite 기반 Next.js 프레임워크). Vitest 4와 같은 React 플러그인을 공유한다.
- 설정: `.storybook/main.ts`에서 `packages/ui/src/**/*.stories.@(ts|tsx|mdx)` 패턴으로 `@tcground/ui` 라이브러리 스토리만 수집하고, `@storybook/addon-docs`, `@storybook/addon-a11y`를 활성화한다.
- Preview: `.storybook/preview.tsx`에서 `app/globals.css`(Tailwind v4 + tcg 토큰)를 import하고 모든 스토리를 `@tcground/ui`의 `TooltipProvider`로 감싼다.
- 카탈로그 범위: `packages/ui/src/components/ui/*` shadcn 기반 공통 UI 컴포넌트 24개와 co-located stories. `components/tcg/*` 도메인 컴포넌트 스토리와 Storybook MCP 도입은 별도 후속 작업이다.
- 스크립트: `pnpm storybook`은 dev 서버, `pnpm build-storybook`은 정적 빌드를 `storybook-static/`에 생성한다. 결과물 디렉터리는 `.gitignore`로 제외한다.

## 9. UI 패키지 배포

- 배포 대상 패키지: `packages/ui` (`@tcground/ui`).
- 공개 import 계약: `import { Button } from '@tcground/ui'`, `import '@tcground/ui/theme.css'`.
- 루트 `tcground` 앱 dependency는 배포본 검증을 위해 `@tcground/ui: ^0.1.0` 같은 npm semver range를 사용한다. `workspace:*`는 UI package 자체 문서/개발 검증이 필요한 `apps/docs`에만 유지한다.
- `pnpm build:ui`는 TypeScript 산출물과 `dist/theme.css`를 생성한다.
- `apps/docs`는 `@tcground/ui/theme.css` export가 `dist`를 바라보므로 `prebuild`/`prestart`에서 `@tcground/ui`를 먼저 빌드한다.
- 배포 전 검증: `pnpm build:ui`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm --filter @tcground/ui pack --dry-run`.
- 실제 npm 배포는 `tcground` npm scope 또는 organization 권한을 확인한 뒤 `packages/ui`에서 `npm publish --access public`로 실행한다.

## 10. 변경 이력

- 2026-05-06: 초기 ARCHITECTURE 정리.
- 2026-05-08: Stitch 기반 전역 CSS 토큰과 `tcg-*` component utility 사용 기준 추가.
- 2026-05-08: 특정 Stitch 화면 1:1 구현 요청 시 실제 Stitch 화면 HTML을 우선 기준으로 삼는 예외 기준 추가.
- 2026-05-20: 구현된 App Router 경로, `components/tcg`, `lib/tcg-data.ts` 기준을 현재 코드 상태에 맞춰 반영.
- 2026-05-20: 인증 수단을 Supabase Auth로 확정하고 Supabase JS/SSR 사용 기준 추가.
- 2026-05-20: MVP Supabase Postgres 데이터 모델 기준과 RLS 방향 추가.
- 2026-05-20: 포켓몬 우선 가격 수집 모델(`card_printings`, `price_observations`, source별 실행 로그)과 실거래가 중심 집계 기준 추가.
- 2026-05-20: 로그인 Supabase Auth 서버 액션, 클라이언트 폼, SSR 세션 갱신용 `proxy.ts` 기준 추가.
- 2026-05-20: 회원가입 Supabase Auth 서버 액션, `/signup` 폼, `/auth/confirm` 이메일 인증 콜백, 공통 `next` 검증 기준 추가.
- 2026-05-20: 공개 페이지 공통 `PublicHeader`와 Supabase Auth claims 기반 헤더 버튼 전환, 로그아웃 서버 액션 기준 추가.
- 2026-05-20: Next.js App Router private folder 기준에 맞춰 `app/login`과 `app/signup`의 route 전용 action/lib 위치를 `_actions`, `_lib`로 정리.
- 2026-05-21: MVP 헤더 메뉴를 `홈 / 검색 / 카테고리 / 인기`로 정리하고 `/categories`, `/cards` 목록 라우트 기준 추가.
- 2026-05-22: `/search` 라우트를 폐기하고 카드 이름 검색을 카테고리 페이지(`/categories/[categoryId]?q=...`)로 흡수. 헤더 메뉴는 `홈 / 카테고리 / 인기`로 정리하고, 헤더/홈 검색 입력은 기본 카테고리 `pokemon`으로 이동하도록 변경.
- 2026-05-21: `components/tcg/` 평탄 구조를 기능 도메인별 `auth/`, `layout/`, `search/` 하위 폴더로 정리하고 같은/다른 도메인 import 규칙 추가. 빈 `components/home/` 디렉터리 제거.
- 2026-05-22: 한국판 포켓몬 1차 자동 가격 adapter source를 `ebay_sold`로 결정하고, eBay Marketplace Insights 승인 전 scraping 자동화 금지 기준 추가.
- 2026-05-22: 검증된 한국판 포켓몬 대표 카드 10장을 Supabase 카탈로그에 seed하고, `/categories/pokemon`과 `/cards/[cardId]`를 `lib/tcg-catalog.ts` 기반 DB 조회로 전환. 가격 snapshot seed 없이 UI view model의 deterministic 표시값만 사용한다.
- 2026-05-22: 포켓몬 seed 카드 8장을 TCGdex equivalent 이미지 URL로 enrichment하고, 이미지 우선순위(`card_printings.image_url` 우선, 목록 `thumbnail_url`, 상세 `image_url` fallback)를 문서화.
- 2026-05-22: Storybook 10(`@storybook/nextjs-vite`) UI 카탈로그 도입. `.storybook/` 설정과 `components/ui/*.stories.tsx`(24개) 추가, `pnpm storybook`/`pnpm build-storybook` 스크립트 등록.
- 2026-05-23: 외부 카드/카테고리 이미지를 직접 `<img>`로 로드하지 않고 `next/image` 최적화 경로로 렌더링하도록 변경. 목록 이미지는 `thumbnail_url`을 우선 사용하고, `next.config.ts`에 `assets.tcgdex.net`, `lh3.googleusercontent.com` remote pattern과 이미지 크기 후보를 추가.
- 2026-05-26: Headless UI 과제용 `packages/ui`와 Docusaurus `apps/docs`를 workspace에 추가. Storybook은 기존 shadcn 카탈로그와 새 headless 컴포넌트 검증을 함께 수집한다.
- 2026-05-27: UI 라이브러리 방향을 기존 앱 `components/ui/*`의 패키지화로 전환. `components/ui`를 제거하고 `packages/ui`를 `@tcground/ui`로 재정의했으며, Storybook은 `packages/ui` stories만 수집한다.
- 2026-05-27: 앱 action button의 기준을 `@tcground/ui` Button으로 통일하고, TCG primary CTA 토큰과 반복 size(`search`, `auth`, `cta`, `tab`, `pill`) 사용 규칙을 추가.
- 2026-05-28: `@tcground/ui` npm 공개 배포 준비 기준 추가. package metadata, public publish 설정, `dist/theme.css` export, README, pack dry-run 검증을 배포 전 필수 항목으로 둔다.
- 2026-05-28: 루트 `tcground` 앱 dependency를 npm 배포본 `@tcground/ui@0.1.0` 소비 기준으로 전환하고, `apps/docs`만 workspace package를 유지하는 기준 추가.
- 2026-05-28: Docusaurus 컴포넌트 문서와 preview 예제 위치(`apps/docs/docs/components/*.mdx`, `apps/docs/src/components/examples/<component>/*`) 기준 추가.
- 2026-06-02: `/categories` 대분류 목록을 fake `tcgCategories`에서 `getTcgCategoryOverview` 기반 Supabase 집계로 전환. 기본 대분류는 포켓몬/유희왕/원피스/매직 더 개더링을 항상 노출하고, 미연결 데이터는 0으로 표시한다. 화면은 관련 이미지 배경 타일 중심으로 재설계했다.
- 2026-06-03: 가격 데이터 FX/display 모델을 추가. `exchange_rates`와 snapshot source/display 가격 컬럼 migration SQL을 준비하고, 수동 CSV sold 관측치 저장, asking/sold snapshot 적재, 한국수출입은행 FX fetch/import, 카드 상세 display 가격/환율 기준일 표시 기준을 추가했다. 원격 FX migration 적용은 Supabase MCP/CLI 가능 시점에 진행한다.
- 2026-06-03: 전체 한국판 포켓몬 카탈로그 가격 검증 backlog를 `PKMKR-<card_num>` pending CSV 행으로 확장했다. 이 backlog는 실제 sold 가격이 아니며 `exclude_reason=pending_evidence`로 공개 가격 산정에서 제외한다. 후속 evidence import가 DB row 수정 없이 해소되도록 sample id resolver가 `external_ids.card_num` 기반 fallback을 제공한다.
- 2026-06-04: `memory-bank/price-source-validation.csv`의 legacy `KR-*` sample id를 공식 `PKMKR-<card_num>` 체계로 통일했다. `KR-001`~`KR-060`은 `raw_payload_json.worklist_id`로 보존하고, 증거 없는 `KR-061`~`KR-110` 잠정 pending skeleton은 제거했다.
- 2026-06-04: 카드 목록/인기 카드 이미지 기본값을 한국판 printing과 한국 포켓몬센터 이미지 우선으로 정리했다. 상품 상세는 `edition=kr|jp|na` 선택을 지원하며 기본은 한국판이다. 가격 히스토리 bucket key에 `market`을 포함해 KR/JP/NA 시장 가격을 같은 선으로 섞지 않는다.
- 2026-06-04: 수동 가격 CSV의 sold snapshot을 source별로 집계하고, 상세 차트의 sold/asking 분류를 `aggregation_method` 우선으로 변경했다. PriceCharting 개별 eBay completed-sale 행은 `pricecharting_ebay_sold` source로 보존하고, 번개장터 수동 sold와 asking은 같은 `source_name`이어도 서로 섞지 않는다.
