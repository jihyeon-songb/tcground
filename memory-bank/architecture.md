# ARCHITECTURE

> 기술 스택·디렉터리 구조·수정 범위·Next.js/UI 가이드.
> 명명·코딩 스타일·테스트·커밋 룰은 `CONVENTIONS.md`.
> 마지막 갱신: 2026-05-20

## 1. 스택

- Next.js 16 (App Router) · React 19 · TypeScript 5 (strict)
- Tailwind CSS v4 + `prettier-plugin-tailwindcss`
- shadcn/ui (Radix 기반) + lucide-react + class-variance-authority + tailwind-merge + clsx + cmdk
- Supabase JS + Supabase SSR (Auth/서버 클라이언트)
- Vitest 4 + Testing Library + jsdom
- ESLint 9 (`next/core-web-vitals` + `next/typescript`)
- pnpm (단일 앱. `pnpm-workspace.yaml`은 미래 확장용)

전제: Node 20+, pnpm.

## 2. 디렉터리 구조

```
app/                 # Next.js App Router (페이지·layout·route handler)
  layout.tsx         # 루트 레이아웃 + TooltipProvider
  page.tsx           # 홈
  search/page.tsx    # 검색 결과
  categories/[categoryId]/page.tsx # 카테고리 탐색
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
  ui/                # shadcn/ui 생성 컴포넌트 (직접 수정 지양)
  tcg/               # TCGround 도메인 컴포넌트
lib/                 # 도메인 정적 데이터·유틸·Supabase 클라이언트
public/              # 정적 자산
docs/                # 본 문서들
```

핵심 위치:

- 절대 import 별칭: `@/*` → 프로젝트 루트 (예: `@/components/ui/button`).
- 공통 UI 부품: `components/ui/*` (shadcn). 도메인 컴포넌트는 `components/<domain>/*`로 신설.
- TCGround 도메인 컴포넌트: `components/tcg/*`.
- 공개 페이지 공통 헤더: `components/tcg/PublicHeader.tsx`. 서버 컴포넌트에서 Supabase Auth `getClaims()`로 인증 상태를 확인하고, 페이지별 검색창 옵션과 현재 내부 경로(`next`)만 props로 받는다.
- 로그인 인증 동작: `app/login/_actions/login.ts` 서버 액션, `app/login/_lib/login-utils.ts` route 전용 유틸, `components/tcg/LoginForm.tsx` 클라이언트 폼을 기준으로 한다.
- 회원가입 인증 동작: `app/signup/_actions/signup.ts` 서버 액션, `app/signup/_lib/signup-utils.ts` route 전용 유틸, `components/tcg/SignupForm.tsx` 클라이언트 폼을 기준으로 한다.
- App Router route segment 안에서 route 전용 지원 파일을 둘 때는 `_actions`, `_lib` 같은 private folder를 사용해 공개 route 파일(`page.tsx`, `route.ts`)과 내부 구현 파일을 구분한다.
- 로그아웃 인증 동작: `components/tcg/logout-action.ts` 서버 액션에서 `supabase.auth.signOut()`을 호출하고 항상 `/`로 이동한다.
- Supabase 이메일 확인 링크는 `app/auth/confirm/route.ts`에서 `token_hash`, `type`, optional `next`를 받아 `verifyOtp`로 처리한다. Confirm signup 이메일 템플릿은 `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`처럼 `token_hash`와 `type`을 `/auth/confirm` 요청에 포함해야 한다.
- 인증 진입점의 `next` 값은 `lib/auth/redirect.ts`에서 내부 경로만 허용하며, 외부 URL, protocol-relative URL, `/login`, `/signup`은 `/`로 fallback한다.
- 현재 정적 카드/카테고리 데이터: `lib/tcg-data.ts`. 실데이터 연동 전까지 페이지 간 링크와 가격 표시의 기준 데이터로 사용한다.
- Supabase 클라이언트 유틸은 shadcn Supabase Next.js 컴포넌트가 생성하는 파일을 기준으로 사용하고, 세션 쿠키 갱신은 루트 `proxy.ts`에서 `lib/supabase/middleware.ts`를 호출해 처리한다.
- 디자인 토큰·전역 CSS: `app/globals.css`.
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
- daily job은 `price_observations` 저장, 이상치 제거/매칭 검증, `card_price_snapshots` 집계 순서로 처리한다.
- 일본/한국 가격 source는 공개 API가 부족할 수 있으므로 수동 import와 ToS가 허용된 source adapter를 분리해 붙인다.

## 4. 수정 범위

**수정 허용**

- `app/**` — App Router 페이지·레이아웃·route handler
- `components/**` (단, `components/ui/**` 제외) — 도메인 컴포넌트
- `lib/**`, `hooks/**`, `types/**` — 유틸·훅·타입 (없으면 생성 가능)
- `public/**` — 정적 자산
- `docs/**` — 본 문서 (작업 완료 후 갱신)
- `*.config.{ts,mjs,js}`, `tsconfig.json`, `.prettierrc` — 변경 시 PR 본문에 사유 명시

**수정 시 주의 (덮어쓰기 위험)**

- `components/ui/**` — shadcn CLI로 생성된 코드. 직접 수정하면 `npx shadcn add`로 다시 추가할 때 충돌 가능. 토큰·색상 같은 디자인 변경은 `app/globals.css`·CSS 변수에서 우선 시도.

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

## 8. 변경 이력

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
