# IMPLEMENTATION PLAN

> PRD를 단계와 작업으로 분해한 실행 계획.
> 마지막 갱신: 2026-05-08

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

- [ ] 페이지별 라우트 구조 결정.
- [x] 홈 화면에서 사용할 1차 링크 타깃 정의: 검색 `/search?q=...`, 카테고리 `/categories/[categoryId]`, 카드 상세 `/cards/[cardId]`.
- [ ] 공통 헤더/검색 진입 UX 정의.
- [ ] 카테고리 URL 구조 결정.
- [ ] 상품 상세 URL 구조 결정.

### 3. 데이터 모델 설계

- [ ] 카드 기본 정보 모델 정의.
- [ ] 가격 요약/가격 히스토리 모델 정의.
- [ ] 카테고리 모델 정의.
- [ ] 관심 카드 모델 정의.

### 4. UI 구현

- 영향 파일: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `components/tcg/HomeSearchForm.tsx`, `components/tcg/HomeSearchForm.test.tsx`.
- 최소 변경 범위: Stitch `TCGround Price Tracker`의 `TCGround | Home (Search Optimized)` 화면 HTML 구조, 한국어 문구, 히어로 검색, 이미지 카드 구성을 우선 기준으로 홈페이지 UI를 재구현한다.
- [x] Stitch `TCGround Price Tracker` 디자인 시스템 기반 전역 CSS 토큰과 `tcg-*` component utility 구조 수립.
- [x] 홈페이지 검색/카테고리/인기 카드 영역을 `TCGround | Home (Search Optimized)` 기준으로 갱신.
- [ ] 검색 결과 목록과 상태 화면 구현.
- [ ] 카테고리 탐색 화면 구현.
- [ ] 상품 상세 정보와 가격 차트 구현.
- [ ] 로그인 화면 구현.

### 5. 품질 게이트

- [x] `pnpm lint`
- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm test --run`

## 다음 작업

홈에서 연결한 `/search?q=...` 라우트를 기준으로 검색 결과 목록과 상태 화면을 정적 데이터 기반으로 구현한다.
