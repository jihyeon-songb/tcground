# ARCHITECTURE

> 기술 스택·디렉터리 구조·수정 범위·Next.js/UI 가이드.
> 명명·코딩 스타일·테스트·커밋 룰은 `CONVENTIONS.md`.
> 마지막 갱신: 2026-05-06

## 1. 스택

- Next.js 16 (App Router) · React 19 · TypeScript 5 (strict)
- Tailwind CSS v4 + `prettier-plugin-tailwindcss`
- shadcn/ui (Radix 기반) + lucide-react + class-variance-authority + tailwind-merge + clsx + cmdk
- Vitest 4 + Testing Library + jsdom
- ESLint 9 (`next/core-web-vitals` + `next/typescript`)
- pnpm (단일 앱. `pnpm-workspace.yaml`은 미래 확장용)

전제: Node 20+, pnpm.

## 2. 디렉터리 구조

```
app/                 # Next.js App Router (페이지·layout·route handler)
  layout.tsx         # 루트 레이아웃 + TooltipProvider
  page.tsx           # 홈
  globals.css        # Tailwind 엔트리 + CSS 변수 / 디자인 토큰
components/
  ui/                # shadcn/ui 생성 컴포넌트 (직접 수정 지양)
public/              # 정적 자산
docs/                # 본 문서들
```

핵심 위치:

- 절대 import 별칭: `@/*` → 프로젝트 루트 (예: `@/components/ui/button`).
- 공통 UI 부품: `components/ui/*` (shadcn). 도메인 컴포넌트는 `components/<domain>/*`로 신설.
- 디자인 토큰·전역 CSS: `app/globals.css`.
- 향후 추가 예정 디렉터리: `lib/` (유틸·서버 클라이언트), `hooks/`, `types/`.

## 3. 수정 범위

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

## 4. Next.js 가이드

- 기본은 Server Component. 상호작용·브라우저 API·hooks가 필요할 때만 Client Component(`'use client'`).
- 서버 API에는 route handler를 우선 사용한다.
- 모든 사용자 입력은 서버에서 검증한다.
- DB 쓰기는 서버에서만.
- SEO가 중요한 페이지에 `metadata`를 정의한다.
- 민감 로직을 Client Component에 두지 않는다.

## 5. UI 가이드

- Tailwind는 CSS 변수와 `app/globals.css` 토큰을 우선 사용. shadcn 컴포넌트와 일관성 유지.
- Stitch `TCGround Price Tracker` 디자인 시스템의 Manrope, warm-cream surface, Pinterest Red CTA, flat editorial 카드 규칙을 `app/globals.css`의 전역 CSS 변수와 `tcg-*` component utility로 관리한다.
- 사용자가 특정 Stitch 화면 1:1 구현을 요청한 경우, 해당 Stitch 화면의 실제 HTML 구조·문구·이미지·색상 값을 우선 기준으로 삼고 PRD P0 기능은 그 화면 안에서 가능한 범위로 유지한다.
- 페이지 레이아웃은 `.tcg-page`, `.tcg-shell`, `.tcg-section`을 기본 골격으로 삼고, 카드/검색/칩/가격 표시 같은 반복 패턴은 `.tcg-card-surface`, `.tcg-search-shell`, `.tcg-chip-*`, `.tcg-price`를 우선 사용한다.
- 모바일 → 데스크톱 반응형.
- 버튼·라벨·폼·포커스는 접근성을 기본으로 고려.
- 명시적 요청 없이 새 UI 라이브러리 추가 금지.
- 앱 화면에는 과한 마케팅형 섹션을 피한다. 별도 요청이 없는 한 랜딩보다 실제 제품 화면을 먼저 만든다.

## 6. 예정 인프라

| 영역                  | 후보                                |
| --------------------- | ----------------------------------- |
| 호스팅                | Vercel                              |
| DB                    | Supabase Postgres                   |
| 인증                  | Supabase Auth 또는 Clerk            |
| 이미지 저장           | Supabase Storage 또는 Cloudflare R2 |
| 캐시·rate limit·queue | Upstash Redis                       |
| 이메일                | Resend                              |

> 도입 시 시크릿·세션 처리 코드는 코드오너 리뷰 필수.
> 결정 사항은 `PRD.md`의 "결정 대기"와 동기화 유지.

## 7. 변경 이력

- 2026-05-06: 초기 ARCHITECTURE 정리.
- 2026-05-08: Stitch 기반 전역 CSS 토큰과 `tcg-*` component utility 사용 기준 추가.
- 2026-05-08: 특정 Stitch 화면 1:1 구현 요청 시 실제 Stitch 화면 HTML을 우선 기준으로 삼는 예외 기준 추가.
