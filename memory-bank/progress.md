# PROGRESS

> 작업 진행 상황과 의사결정 로그.
> 마지막 갱신: 2026-05-08

## 현재 작업

- 2026-05-08: Stitch `TCGround Price Tracker` 디자인 시스템과 화면 구성을 기준으로 MVP 페이지 UI 구현 중.

## 완료 로그

- 2026-05-08: Stitch `TCGround Price Tracker` 디자인 시스템을 `app/globals.css`의 전역 토큰, shadcn semantic token, `tcg-*` component utility 구조로 반영했다. 루트 폰트는 Manrope 기반으로 맞췄고 `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`를 통과했다.
- 2026-05-08: 이전 세션의 TCGround 페이지별 PRD 초안을 `memory-bank/prd/*.md` 구조로 정리했다. 제품 전체 PRD의 MVP 범위도 로그인, 홈, 검색 결과, 카테고리, 상품 상세 중심으로 갱신했다.
- 2026-05-08: `AGENTS.md`의 PRD 참조 경로를 `memory-bank/prd-*.md`에서 `memory-bank/prd/*.md` 구조로 갱신했다.
- 2026-05-08: `memory-bank/prd/` 디렉터리 안의 PRD 파일명에서 중복 접두사 `prd-`를 제거하고 `AGENTS.md`와 실행 계획의 참조를 갱신했다.

## 의사결정 로그

- 2026-05-08: CSS 구조는 별도 CSS 파일을 늘리지 않고 `app/globals.css` 한 곳에서 Tailwind v4 `@theme inline`, semantic color token, `tcg-*` component utility 레이어로 관리한다. 이유는 shadcn 컴포넌트가 CSS 변수 기반이고, 현재 단계에서는 도메인 화면 공통 패턴을 빠르게 공유하는 것이 우선이기 때문이다.
- 2026-05-08: PRD 파일은 제품 전체 계획 파일(`plan.md`)과 페이지별 파일(`login.md`, `home.md`, `search-results.md`, `category.md`, `product-detail.md`)로 분리한다. 이유는 페이지 단위 구현 시 목표, 사용자 스토리, P0/P1 요구사항을 빠르게 참조하기 위해서다.
