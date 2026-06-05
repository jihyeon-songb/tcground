# TCGround

**라이브:** [tcground.vercel.app](https://tcground.vercel.app/)

TCG(트레이딩 카드 게임) 카드의 **시세를 추적하고**, 컬렉터가 정보를 공유하는 커뮤니티 서비스입니다. 한국의 포켓몬·유희왕·매직 더 개더링 컬렉터가 카드를 사고팔기 전에 적정 가격을 확인하는 것을 목표로 합니다.

> 현재 MVP: 검색 가능한 홈, 카테고리 탐색, 카드 상세(평균/최저/최고가·가격 변동 차트), 이메일 로그인/회원가입. 가격 추적 → 커뮤니티 → 중고 거래 → 경매로 단계적 확장 예정.

## 기술 스택

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5** (strict)
- **Tailwind CSS v4** + shadcn/ui 계열 컴포넌트 + lucide-react
- **Supabase** (Auth · Postgres · SSR 클라이언트)
- **Vitest 4** + Testing Library + jsdom
- **pnpm workspace** 모노레포 · ESLint 9 · Storybook 10

## 모노레포 구성

| 워크스페이스 | 설명 |
| --- | --- |
| `.` (root) | `tcground` Next.js 앱 (서비스 본체) |
| `packages/headless` | `@tcground/headless` — unstyled 접근성 primitive |
| `packages/ui` | `@tcground/ui` — 공통 UI 컴포넌트 라이브러리 (npm 배포 대상) |
| `apps/docs` | Docusaurus 기반 `@tcground/ui` 컴포넌트 문서 사이트 |

## 시작하기

**사전 요구사항:** Node 20+, pnpm

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정 (.env.example 참고)
cp .env.example .env.local
#   → Supabase URL/키 등 값 채우기

# 3. 개발 서버 실행
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

### 환경 변수

`.env.local`에 설정합니다. 전체 목록과 설명은 [`.env.example`](./.env.example)을 참고하세요.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — 브라우저용 Supabase 공개 키
- `SUPABASE_SERVICE_ROLE_KEY` — 서버 전용. RLS deny-all 가격 테이블 쓰기(크론/스크립트)에 필요
- `KOREA_EXIM_FX_API_KEY` — 환율(KRW 환산) 수집용
- `EBAY_*` — eBay API 키셋
- `KREAM_/BUNJANG_/JOONGNA_COLLECTION_ENABLED` — 국내 시세 수집 어댑터 스캐폴드 플래그(기본 `false`)
- `CRON_SECRET` — Vercel Cron 가격 수집 라우트 보호용 공유 시크릿

> `.env*` 파일은 절대 커밋하지 않습니다 (`.env.example`만 허용).

## 주요 명령어

| 작업 | 명령어 |
| --- | --- |
| 개발 서버 | `pnpm dev` |
| 빌드 / 실행 | `pnpm build` · `pnpm start` |
| 테스트 | `pnpm test` (감시) · `pnpm test --run` (1회) |
| 린트 / 타입체크 | `pnpm lint` · `pnpm exec tsc --noEmit` |
| 포맷 | `pnpm format` · `pnpm format:check` |
| Storybook | `pnpm storybook` |
| 문서 사이트 | `pnpm docs` (Docusaurus) |
| 카탈로그 임포트 | `pnpm import:cards` · `pnpm import:kr` |

### 품질 게이트 (PR 머지 전 모두 통과)

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test --run
```

## 프로젝트 구조

```
app/                 # Next.js App Router (페이지·layout·route handler)
  page.tsx           #   홈 (검색 진입)
  categories/        #   TCG 대분류 목록 · 카테고리별 탐색(?q= 검색·필터)
  cards/             #   인기 카드 목록 · 카드 상세(시세·변동 차트)
  login/ signup/     #   이메일 인증 (Supabase)
  api/cron/          #   일일 가격 수집 크론 라우트
components/tcg/      # 도메인 컴포넌트 (layout · search · auth)
lib/                 # 카탈로그·가격 도메인 로직 + Supabase 클라이언트
scripts/             # 카탈로그/시세 임포트·수집 CLI (tsx)
supabase/migrations/ # DB 마이그레이션
packages/ ・ apps/    # 모노레포 워크스페이스 (위 표 참고)
memory-bank/         # PRD·아키텍처·진행 로그 등 프로젝트 문서
```

## 데이터 · 가격 수집

- 카탈로그는 공개 소스에서 임포트하고, 시세는 자체 집계합니다.
- 가격은 Vercel Cron(`/api/cron/collect-prices`, 1일 1회)으로 수집되며, 출처 통화/금액을 보존한 채 한국 수출입은행 환율로 KRW 환산값을 함께 저장합니다.
- **Supabase 스키마/설정 변경은 반드시 Supabase MCP 또는 CLI로만** 수행합니다(대시보드 수동 변경·임시 SQL 금지).

## 문서

- [`AGENTS.md`](./AGENTS.md) — AI 코딩 에이전트 진입점·작업 규약
- [`memory-bank/`](./memory-bank/) — PRD · 아키텍처 · 컨벤션 · 진행 로그
- [`DESIGN.md`](./DESIGN.md) — 디자인 가이드
- `pnpm docs` / `pnpm storybook` — `@tcground/ui` 컴포넌트 문서·카탈로그

## 배포

[Vercel](https://vercel.com)에 배포되어 있습니다 → **[tcground.vercel.app](https://tcground.vercel.app/)**. 환경 변수와 `CRON_SECRET`을 프로젝트 설정에 등록하고, 가격 수집 크론은 [`vercel.json`](./vercel.json)에 정의되어 있습니다.
