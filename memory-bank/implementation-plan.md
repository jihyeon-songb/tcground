# IMPLEMENTATION PLAN

> PRD를 단계와 작업으로 분해한 실행 계획.
> 마지막 갱신: 2026-06-05 (KREAM Supabase 재대조 보강)

## 현재 기준 PRD

- `memory-bank/prd/plan.md`
- `memory-bank/prd/login.md`
- `memory-bank/prd/home.md`
- `memory-bank/prd/search-results.md`
- `memory-bank/prd/category.md`
- `memory-bank/prd/product-detail.md`
- `memory-bank/prd/headless-ui.md`

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
- [x] eBay Developer 계정, Buy API production access, Marketplace Insights access 가능 여부 확인. → 개발자 계정은 생성, Browse API는 사용 가능. Marketplace Insights(sold)는 Limited Release로 개인/취미 프로젝트 승인이 어려워 사실상 닫힘으로 결론.
- [x] API License Agreement 기준 데이터 저장/표시/집계 범위를 검토하고, raw eBay content와 공개 snapshot 표시 계약을 분리한다. → 데이터 최소화 정책(저장/미저장 필드)과 `card_price_snapshots` 공개 표시 분리를 `architecture.md`에 문서화.
- [x] `ebay_sold` adapter 입력 계약 확정: keyword/category/date window/condition filters, card_printing 매칭 필드, 단일 카드 판정 규칙. → `lib/pricing/price-source.types.ts` 계약과 `marketplace-insights-adapter.ts`/`csv-import.ts` 매핑·단일 카드 규칙으로 구현.
- [x] `lastSoldDate`, `lastSoldPrice`, `totalSoldQuantity`, condition, item/itemSales ID, item URL, seller/user 관련 필드 저장 최소화 정책 확정. → 가격·일자·상태·등급·item id/url·축소 raw_payload만 저장하고 seller/user 식별 정보는 저장하지 않도록 확정·구현.
- [ ] 승인 후 `price_observations` import adapter와 collection run logging 구현. → Browse 기반 collection run logging은 구현(`collect-prices.ts`/cron). Marketplace Insights import adapter는 승인 전까지 scaffold(`EbayAccessNotGrantedError`)로 보류.

### 3.5 한국판 전체 가격 수집 실행 (로컬 런북)

- 영향 파일: `scripts/collect-prices.ts`, `lib/pricing/**`, `.env.local`(설정), `memory-bank/price-source-validation.csv`, `memory-bank/progress.md`, `memory-bank/trouble-shooting.md`.
- 목적: `card_price_snapshots`에 실데이터를 적재해 목록/상세의 "시세 정보 없음"을 실제 가격으로 전환한다. 범위 = 우선 카드 sold evidence + 자동 전체 asking 2트랙.
- 제약: 실거래가 소스(PriceCharting/eBay/KREAM/번개/중고나라)는 Claude 환경(WebFetch)에서 전부 차단되므로 **수집은 한국 IP 로컬에서 사용자가 실행**한다. 가격 조작 금지(증거 없는 행은 만들지 않는다).
- 현재 baseline(2026-06-04, Supabase `tcground` 조회): ko/KR 프린팅 3,668개 중 snapshot 보유 34개, total snapshot 113, observation 107. 기존 snapshot `source_name`은 구식 `aggregate`라 `--csv` 재import 시 소스별로 갱신된다.
- 2026-06-05 batch/progress 변경: eBay scrape 전체 실행이 browser context 종료로 `partial/0`이었으므로, `--offset`, `--limit`, `--source-batch-size` 옵션을 추가해 50~100장 단위로 실행/기록/재시도 가능하게 바꿨다. 이어 offset 0~49, 50~99가 모두 succeeded/0이어서 단순 재시도 대신 parser/challenge를 점검했고, eBay live HTML의 `s-card` markup과 HTTP 200 browser verification page를 처리하도록 `lib/pricing/ebay/scrape-adapter.ts`를 보강했다. 영향 파일은 `scripts/collect-prices.ts`, `lib/pricing/collect-prices.ts`, `lib/pricing/collect-prices.test.ts`, `lib/pricing/ebay/scrape-adapter.ts`, `lib/pricing/ebay/scrape-adapter.test.ts`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/trouble-shooting.md`로 제한했다.
- 2026-06-05 중고나라 변경: `joongna` 자동 asking source를 추가했다. 공개 search page hydration 데이터에서 상품 `seq`/title/price만 최소 추출하고, 카드명 검색 + 세트/번호 confidence + 중고나라 전용 제외어로 단일 카드 호가만 `joongna_asking_median` snapshot에 저장한다. 영향 파일은 `lib/pricing/joongna/**`, `lib/pricing/collect-prices.ts`, `scripts/collect-prices.ts`, `lib/pricing/price-source.types.ts`, `lib/tcg-catalog.ts`, `.env.example`, 관련 테스트, memory-bank 문서로 제한한다.

사전 준비
- 한국/거주용 IP(VPN) 연결 — KREAM·eBay-scrape 차단 회피 필수.
- Playwright chromium 준비됨(`chromium-1223` 캐시). 없으면 `npx playwright install chromium`.
- (asking 전체 실데이터 시) `.env.local`을 `EBAY_ENV=production` + production `EBAY_CLIENT_ID/SECRET`로 교체. 현재 `EBAY_ENV=sandbox`라 Browse API 접근은 되지만 실제 listing snapshot은 기대하지 않는다.
- `--fx`(KRW 환산) 사용 시 `.env.local`에 `KOREA_EXIM_FX_API_KEY` 필요. 현재 키 설정 후 CSV+FX 재적재는 완료됐다.
- enable 상태(2026-06-05 확인): `KREAM_COLLECTION_ENABLED=true`, `BUNJANG_COLLECTION_ENABLED=true`, `EBAY_SCRAPE_ENABLED=true`, `GUARDIAN_API_KEY` 설정, `EBAY_MARKETPLACE_INSIGHTS_ENABLED=false`.
- 중고나라 자동 asking 수집은 실행 시 `JOONGNA_COLLECTION_ENABLED=true`를 임시로 주입한다. 기본 `.env.example`은 `false`이며, 실거래가가 아니라 판매중 호가 보조 trend로만 표시한다.

실행 (쓰기 전 항상 `--dry-run` 먼저)
- [ ] 기존 검증 CSV evidence + asking import:
  `node --env-file=.env.local --import tsx scripts/collect-prices.ts --csv --csv-asking`
  (dry-run 검증 완료: sold parsed=109/resolved=109/snapshots=107, asking 9/9/5)
- [x] 검증용 제한 실행 옵션 추가:
  `node --env-file=.env.local --import tsx scripts/collect-prices.ts --browse --dry-run --limit 5`
  결과: `cardsProcessed=5`, `ebay_browse` succeeded, `snapshotsUpserted=0`(sandbox listing 없음).
- [x] 활성 source 제한 dry-run:
  `node --env-file=.env.local --import tsx scripts/collect-prices.ts --dry-run --limit 2`
  결과: `ebay_browse`, `bunjang`, `ebay_scrape`는 실패 없이 종료, `guardian_tcg`는 한국 카드 표본 404, `kream`은 500으로 실패. 전체 status는 `partial`.
- [ ] 자동 전체 수집(핵심): `node --env-file=.env.local --import tsx scripts/collect-prices.ts`
  = enabled 소스 전부(eBay Browse asking 전 3,668 + KREAM/eBay-scrape sold). Playwright 자동 기동.
  - 2026-06-05 production 전환 없이 `--bunjang --ebay-scrape` 실제 쓰기를 실행했다. Bunjang은 succeeded로 26개 snapshot을 생성했고, eBay scrape는 browser context 종료로 partial/0 observations/0 snapshots라 후속 batch/progress 재시도가 필요하다. KREAM은 제한 dry-run에서 5/5 500이라 제외했다.
- [x] eBay scrape batch/progress 재시도 옵션 추가:
  `node --env-file=.env.local --import tsx scripts/collect-prices.ts --ebay-scrape --offset 0 --limit 50 --source-batch-size 50`
  결과: `cardsProcessed=50`, `ebay_scrape` succeeded, batch metadata(`cardStart=0`, `cardEnd=49`, `sourceBatchSize=50`)가 `price_collection_runs.metadata`에 기록됨. 매칭된 sold observation/snapshot은 0건.
- [x] eBay scrape 다음 batch 실행:
  `node --env-file=.env.local --import tsx scripts/collect-prices.ts --ebay-scrape --offset 50 --limit 50 --source-batch-size 50`
  결과: `cardsProcessed=50`, `ebay_scrape` succeeded, batch metadata(`cardStart=50`, `cardEnd=99`, `sourceBatchSize=50`)가 `price_collection_runs.metadata`에 기록됨. 매칭된 sold observation/snapshot은 0건.
- [x] eBay scrape 0건 원인 점검:
  live HTML probe 결과 기존 `s-item` selector가 현재 `s-card` search result markup을 읽지 못했고, eBay browser verification page가 HTTP 200으로 내려와 빈 결과처럼 처리될 수 있었다. `s-card` 파서와 challenge detection을 추가했으며, 수정 후 `--ebay-scrape --dry-run --offset 50 --limit 2 --source-batch-size 2`는 verification page를 `failed`로 기록한다.
- [x] 중고나라 자동 asking source 추가:
  `lib/pricing/joongna/joongna-adapter.ts`와 `--joongna` CLI flag를 추가했다. `--joongna --dry-run --offset 0 --limit 20 --source-batch-size 20` 결과 `cardsProcessed=20`, `status=succeeded`, dry-run snapshot 1개가 생성됐다. `리자몽 ex 201/165`처럼 collector number를 붙인 검색어는 중고나라 결과가 0이라 중고나라 source만 카드명 중심 검색을 사용하고, 실제 snapshot 여부는 매칭 confidence와 제외어 필터가 결정한다.
- [ ] 중고나라 전체 asking 수집:
  `JOONGNA_COLLECTION_ENABLED=true node --env-file=.env.local --import tsx scripts/collect-prices.ts --joongna --source-batch-size 100`
  100장 단위로 `price_collection_runs` batch를 기록한다.
- [ ] (선택) 단일 소스 재시도: `--kream` / `--ebay-scrape` / `--browse`. 실패 batch만 재시도할 때는 `--offset <batch start> --limit <batch size> --source-batch-size <batch size>`를 같이 쓴다.
- [x] 로그인 Playwright 기반 KREAM 수동 evidence 수집 1차:
  `포켓몬카드 한글판` 검색 결과에서 product link 2,045개, 거래 표시 상품 272개를 확인했다. 현재 DOM에 유지된 246개를 상세 수집해 176개 상품의 체결 446건을 `memory-bank/kream-scrape/kream-product-details.json`에 저장했다. 기존 카탈로그와 확실히 매칭된 2건(`803225` 이브이 ex SAR 223/187, `804730` 파이리 AR 168/165)은 `price-source-validation.csv`에 `manual_kream`으로 추가했고, 174개 상품 444건은 카탈로그 미등록/미매칭으로 `memory-bank/kream-scrape/kream-matching-report.json`/`kream-worklist-inbox.md`에 보류했다. 70개 상품은 상세 HTML 기본 페이지/HTTP 500/로그인 리다이렉트로 재로그인 후 재수집이 필요하다.
- [x] 재로그인 후 KREAM 직접 상세 보강:
  상위 30개 product detail page를 Playwright 로그인 세션에서 직접 열어 체결 196건을 확인했다. Supabase `card_printings`와 매칭된 18개 상품 115건 중 기존 CSV 중복 58건을 제외하고 57건을 `manual_kream` evidence로 추가했다. 사용자 입력 예시인 `802229` 릴리에의 결심 SAR 090/063 5건을 포함하며, `79041` 기라티나 V는 Supabase 조회로 `111/100`, `PKMKR-BS2022014110`을 확정한 뒤 반영했다. 결과 리포트는 `memory-bank/kream-scrape/kream-direct-matching-report.json`에 저장했다.
- [x] KREAM 보류 상품 Supabase 재대조 보강:
  사용자 요청에 따라 메가개굴닌자 계열과 레쿠쟈 VMAX HR은 제외했다. `memory-bank/kream-scrape/kream-matching-report.json`의 보류 상품 중 Supabase `card_printings`와 세트코드/번호가 일치한 14개 상품을 구조화 inbox(`memory-bank/kream-scrape/kream-supabase-resolved-inbox-20260605.json`)로 만들고, 기존 CSV 중복인 잉어킹 4건을 제외한 13개 상품 24건을 `manual_kream` evidence로 추가했다.
- [x] KREAM 남은 미해소 상품 현대 세트 우선 재대조:
  기존 `manual_kream` CSV product id를 제외한 `kream-matching-report.json` unresolved 160개 중 `M*`, `SV*`, `S10~S12`, `S6~S9` 후보 80개를 Supabase MCP로 재조회했다. `set_code + collector_number + ko/KR printing`이 일치한 14개 상품을 구조화 inbox(`memory-bank/kream-scrape/kream-supabase-resolved-modern-inbox-20260605.json`)로 만들고, 중복 없이 25건을 `manual_kream` evidence로 추가했다. DB에 시크릿/프로모/구세대 프린팅이 없거나 세트코드가 일치하지 않는 후보는 CSV에 넣지 않았다.

우선 카드 부족분 (raw sold < 3, 2026-06-04 기준 28장) — 자동 sold 수집이 우선 채울 대상
- `KR-020`(테라파고스 ex 237/187), `KR-028`(푸크린 ex 189/165), `KR-029`(리자몽 ex 139/108), `KR-032`(가디안 ex 348/190), `KR-033`(미라이돈 ex 358/190), `KR-034`(코라이돈 ex 360/190), `KR-035`(파오젠 ex 357/190), `KR-038`(코라이돈 ex 103/078), `KR-040`(코라이돈 ex 106/078), `KR-041`~`KR-046`(로켓단의 영광 SV10), `KR-047`~`KR-051`(블랙볼트/화이트플레어 SV11W·SV11B), `KR-052`~`KR-054`(SV9), `KR-055`·`KR-056`(오거폰 SV6), `KR-057`·`KR-058`(SV5a), `KR-059`·`KR-060`(SV7).

검증
- [x] 제한 dry-run 수치 정상 출력.
- [x] Supabase 읽기로 dry-run 후 row count 유지 확인: `card_price_snapshots=112`, `price_observations=109`, `price_collection_runs=2`, `exchange_rates=1449`.
- [x] 실제 쓰기 실행 후 Supabase 읽기로 `card_price_snapshots`/`price_collection_runs` 증가·소스별 status 확인. 최종 count: `card_price_snapshots=138`, `price_observations=109`, `price_collection_runs=4`, `exchange_rates=1449`. source별 snapshot: `pricecharting_ebay_sold=64`, `ebay_sold=30`, `bunjang=26`, `manual_bunjang=10`, `manual_joongna=5`, `manual_kream=3`.
- [x] eBay scrape batch 재시도 후 Supabase count 확인: `price_observations where source_name='ebay_scrape' = 0`, `card_price_snapshots where source_name='ebay_scrape' = 0`. 최신 `price_collection_runs` 2개는 offset 0~49와 50~99 모두 `status=succeeded`, `observations_inserted=0`, `snapshots_created=0`, metadata에 batch 범위와 `aborted=false` 기록.
- [x] KREAM direct evidence CSV 검증: data row 259개, 27컬럼, malformed 0개, sold 245개, `manual_kream` sold 139개. 같은 `/private/tmp/kream-direct-inbox.json` 재실행 dry-run은 `new rows: 0`, `skipped(dup): 115`로 중복 방지가 동작한다.
- [x] KREAM Supabase 재대조 CSV 검증: data row 283개, 27컬럼, malformed 0개, `manual_kream` sold 163개. `kream-supabase-resolved-inbox-20260605.json` 재실행 dry-run은 `new rows: 0`, `skipped(dup): 28`이고, `scripts/collect-prices.ts --csv --dry-run`은 `parsed=269`, `resolved=269`, `snapshots=258`이다.
- [x] KREAM 현대 세트 재대조 CSV 검증: data row 308개, 27컬럼, malformed 0개, `manual_kream` sold 188개. `kream-supabase-resolved-modern-inbox-20260605.json` 재실행 dry-run은 `new rows: 0`, `skipped(dup): 25`이고, `scripts/collect-prices.ts --csv --dry-run`은 `parsed=294`, `resolved=294`, `snapshots=281`이다. `pnpm lint`(기존 `packages/headless/dist` warning 7개), `pnpm exec tsc --noEmit`, `pnpm test --run`(269/269)이 통과했다.
- [x] `pnpm dev` 후 `/categories/pokemon`·우선 카드 상세에서 실가격/차트 표시 확인. 2026-06-05 `next dev -p 3003`에서 `/categories/pokemon`과 `/cards/sv2a-bs2023014201-리자몽-ex` 렌더, 한국판 기본값, 판본 선택, 가격/표본/차트 영역, 콘솔 에러 없음 확인.

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

### 4.14 Docusaurus UI 컴포넌트 문서 확장

- 영향 파일: `apps/docs/docs/components/**`, `apps/docs/src/components/examples/**`, `apps/docs/sidebars.ts`, `packages/ui/src/theme.css`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `@tcground/ui`가 export하는 24개 공통 UI 컴포넌트 중 이미 문서화된 `button`, `dialog`, `dropdown-menu`, `tabs`, `switch`를 제외한 19개 컴포넌트의 Docusaurus 문서를 추가한다. 기존 MDX 구조(개요, 설치, 사용법, 예제, API Reference, 접근성)와 `ComponentPreview`/`PropsTable` 패턴을 유지한다. 문서 preview가 Tailwind 생성에 의존하지 않도록 필요한 `theme.css` fallback만 최소 보강한다.
- [x] PR1: 폼/입력 계열 문서 작성 — `input`, `textarea`, `label`, `checkbox`, `radio-group`, `select`, `input-group`.
- [x] PR2: 피드백/표시 계열 문서 작성 — `alert`, `badge`, `card`, `avatar`, `separator`, `skeleton`, `table`.
- [x] PR3: 오버레이/복합 인터랙션 문서 작성 — `alert-dialog`, `popover`, `sheet`, `tooltip`, `command`.
  - 영향 파일: `apps/docs/docs/components/{alert-dialog,popover,sheet,tooltip,command}.mdx`, `apps/docs/src/components/examples/{alert-dialog,popover,sheet,tooltip,command}/**`, `apps/docs/sidebars.ts`, `packages/ui/src/theme.css`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
  - 최소 변경 범위: 기존 문서 패턴과 `@tcground/ui` export API를 유지하며, Tailwind class 생성 없이 Docusaurus preview가 보이도록 PR3 대상의 `data-slot` fallback 스타일만 보강한다.

- [x] PR1 컴포넌트별 example 파일과 `index.ts` export 추가.
- [x] PR2 컴포넌트별 example 파일과 `index.ts` export 추가.
- [x] PR3 컴포넌트별 example 파일과 `index.ts` export 추가.
- [x] PR1 기준 `apps/docs/sidebars.ts` 컴포넌트 목록을 실제 문서 목록과 동기화.
- [x] PR2 기준 `apps/docs/sidebars.ts` 컴포넌트 목록을 실제 문서 목록과 동기화.
- [x] PR3 기준 `apps/docs/sidebars.ts` 컴포넌트 목록을 실제 문서 목록과 동기화.
- [x] PR2 preview가 Tailwind 생성에 의존하지 않도록 `theme.css` fallback 스타일 보강.
- [x] PR3 preview가 Tailwind 생성에 의존하지 않도록 `theme.css` fallback 스타일 보강.
- [x] PR1 기준 `pnpm build:docs`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.
- [x] PR2 기준 `pnpm build:docs`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build` 검증.
- [x] PR3 기준 `pnpm build:docs`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build` 검증.

### 4.15 eBay 가격 수집 + 일주일 가격 추적 차트

- 영향 파일: `lib/pricing/**`, `lib/supabase/admin.ts`, `lib/tcg-catalog.ts`, `lib/tcg-data.ts`, `app/api/cron/collect-prices/route.ts`, `app/cards/[cardId]/page.tsx`, `scripts/collect-prices.ts`, `vercel.json`, `.env.example`, `.gitignore`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: 개인 개발자 제약상 sold API가 막혀 있으므로, 일별 시계열은 Browse API(판매중 호가) 일일 수집으로 누적하고 수동 CSV sold 실거래가를 차트 참조점으로 오버레이한다. 카드 상세의 정적 SVG 차트를 `card_price_snapshots` 실데이터 기반으로 교체한다. 시장/통화는 섞지 않는다.
- [x] source-agnostic 어댑터 계약(`price-source.types.ts`)과 관측치→snapshot 집계(`aggregate.ts`, median 보정·신뢰도 임계값) 구현 + 단위 테스트.
- [x] 수동 CSV import 파서(`csv-import.ts`, exclude_reason·단일 카드 규칙·printing 해소) + 단위 테스트.
- [x] eBay OAuth(`ebay-oauth.ts`, client-credentials·토큰 캐시), Browse 어댑터(`browse-adapter.ts`), Marketplace Insights scaffold(`marketplace-insights-adapter.ts`) + fixture/단위 테스트.
- [x] service-role 쓰기 클라이언트(`admin.ts`)와 일일 수집 오케스트레이션(`collect-prices.ts`) + Vercel Cron route(`CRON_SECRET` 검증) + `vercel.json` cron.
- [x] 카드 상세 차트를 snapshot 시계열(asking 추세선 + sold 오버레이 + 빈 상태)로 교체, 통화별 표시.
- [x] `.env.example`/`.gitignore` env 키 추가, `architecture.md`·`implementation-plan.md`·`progress.md` 갱신.
- [x] `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build` 검증.
- [ ] (배포 후) Vercel Cron 일 1회 가동으로 약 7일간 일별 asking series 누적 확인. Browse는 backfill 불가.

### 4.16 핵심 UI primitive 직접 구현 전환

- 영향 파일: `packages/ui/src/components/ui/button.tsx`, `packages/ui/src/components/ui/primitive.tsx`, `packages/ui/src/components/ui/button.test.tsx`, `packages/ui/src/components/ui/tabs.tsx`, `packages/ui/src/components/ui/tabs.test.tsx`, `packages/ui/src/components/ui/dialog.tsx`, `packages/ui/src/components/ui/dialog.test.tsx`, `apps/docs/docs/components/tabs.mdx`, `apps/docs/docs/components/dialog.mdx`, `memory-bank/architecture.md`, `memory-bank/prd/headless-ui.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: Radix UI 같은 접근성 primitive 라이브러리를 지향하기 위해 대표 컴포넌트인 Button, Tabs, Dialog를 Radix primitive 의존 없이 직접 구현한다. 나머지 Radix 기반 컴포넌트는 이번 범위에서 유지한다. Button은 자체 `asChild` prop 병합과 disabled semantics를 보장하고, Tabs는 tablist/tab/tabpanel ARIA와 roving tabindex/방향키 이동을 직접 구현하며, Dialog는 portal, trigger/content 관계, focus trap, Escape/overlay close, focus restore를 직접 구현한다.
- [x] Button의 Radix `Slot` 의존 제거와 `asChild` disabled 처리 구현.
- [x] Tabs의 Radix primitive 의존 제거와 ARIA/keyboard/focus 상태 직접 구현.
- [x] Dialog의 Radix primitive 의존 제거와 portal/focus trap/dismiss/focus restore 직접 구현.
- [x] Button, Tabs, Dialog 단위 테스트 추가 또는 갱신.
- [x] 관련 Docusaurus 문서의 Radix 기반 설명을 직접 primitive 설명으로 갱신.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build:ui`, `pnpm build:docs` 검증.

### 4.17 Headless 레이어 분리 (`@tcground/headless`)

- 영향 파일: `packages/headless/*`(신규 패키지), `packages/ui/src/components/ui/button.tsx`, `packages/ui/src/components/ui/tabs.tsx`, `packages/ui/src/components/ui/dialog.tsx`, `packages/ui/package.json`, `packages/ui/tsconfig.json`, `tsconfig.json`, `vitest.config.mts`, `memory-bank/prd/headless-ui.md`, `memory-bank/implementation-plan.md`.
- 최소 변경 범위: 4.16에서 직접 구현한 Button/Tabs/Dialog의 동작·접근성 로직을 스타일이 전혀 없는 신규 패키지 `@tcground/headless`(unstyled 컴포넌트 + `data-*` hook, Radix Primitives 방식)로 분리한다. `@tcground/ui`는 이 headless 컴포넌트를 소비해 cva/Tailwind 스타일만 입히는 styled 레이어로 전환한다. 공용 primitive(`PrimitiveSlot`/`composeEventHandlers`/`composeRefs`)는 headless로 이동한다. `@tcground/ui`의 공개 export·props는 변경하지 않아 소비처 영향이 없다.
- [x] `@tcground/headless` 패키지 부트스트랩(package.json/tsconfig/build, public publishConfig).
- [x] primitive 헬퍼와 Button/Tabs/Dialog headless 구현 이전(스타일 제거, className 통과, data-attr 계약 보존).
- [x] `@tcground/ui` Button/Tabs/Dialog를 headless 위 styled 래퍼로 재작성, `@tcground/headless` 의존성 추가.
- [x] headless 동작/ARIA/키보드/focus/asChild 단위 테스트 추가.
- [x] resolution 배선: root tsconfig path alias + vitest alias, ui tsconfig `paths` override(node_modules dist 해석).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `vitest run`, `@tcground/headless`·`@tcground/ui` build 검증.
- [ ] 배포 시 `@tcground/headless`를 `@tcground/ui`의 런타임 의존성으로 함께 npm 공개 배포(외부 설치 계약 성립 조건).

### 4.18 Headless 컴포넌트 확장 (Label/Separator/Checkbox/Switch/RadioGroup/AlertDialog/Sheet)

- 영향 파일: `packages/headless/src/{label,separator,checkbox,switch,radio-group,alert-dialog,sheet}.tsx`(신규)와 각 `*.test.tsx`, `packages/headless/src/dialog.tsx`, `packages/headless/src/index.ts`, `packages/headless/README.md`, `packages/ui/src/components/ui/{label,separator,badge,checkbox,switch,radio-group,alert-dialog,sheet}.tsx`, `memory-bank/prd/headless-ui.md`, `memory-bank/implementation-plan.md`.
- 최소 변경 범위: Button 패턴(thin headless primitive + styled wrapper)으로 positioning 엔진이 필요 없는 나머지 Radix 의존 컴포넌트를 `@tcground/headless`로 이전한다. `@tcground/ui`의 공개 export·props와 styled CSS가 읽는 boolean `data-*` 계약(`data-checked`/`data-unchecked`/`data-disabled`/`data-horizontal`/`data-vertical`/`data-open`)을 그대로 유지한다. Floating 오버레이(`popover`/`dropdown-menu`/`select`/`tooltip`)와 `avatar`(이미지 로드 상태)·`command`(cmdk)는 이번 범위에서 제외한다.
- [x] Label, Separator headless 구현 + ui wrapper 전환, `badge`의 `Slot`을 headless `PrimitiveSlot`로 교체.
- [x] Checkbox, Switch, RadioGroup headless 구현(ARIA role/`aria-checked`, Space 토글, radio roving 방향키 선택, controlled/uncontrolled) + ui wrapper 전환.
- [x] `dialog.tsx`를 `role`/`dismissOnOverlayClick` 옵션으로 일반화하고 AlertDialog(`role=alertdialog`, overlay 클릭 미닫힘) / Sheet를 그 위에 구성 + ui wrapper 전환.
- [x] 신규 headless 단위 테스트 추가, `index.ts` export와 README Components 목록 갱신.
- [x] `pnpm exec tsc --noEmit`, `pnpm exec vitest run`, `pnpm lint`, `pnpm --filter @tcground/headless build`, `pnpm build:ui`, `pnpm build:docs`, `pnpm build-storybook` 검증.

### 4.19 `/categories` 대분류 실데이터 전환 및 이미지 타일 재설계

- 영향 파일: `app/categories/page.tsx`, `app/categories/page.test.tsx`, `lib/tcg-catalog.ts`, `lib/tcg-catalog.test.ts`, `lib/tcg-data.ts`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `/categories` 대분류 목록의 fake 숫자 데이터를 제거하고, 포켓몬/유희왕/원피스/매직 더 개더링 기본 대분류를 항상 노출한다. Supabase에 연결된 게임은 실제 `tcg_games`/`cards`/`card_sets`/`card_printings`/`card_price_snapshots` 집계값을 표시하고, 아직 데이터가 없는 기본 대분류는 카드/세트/가격 기록을 0으로 표시한다. 화면은 기존 흰색 정보 카드에서 관련 이미지 배경 타일 중심으로 재설계한다.
- [x] `lib/tcg-catalog.ts`에 `getTcgCategoryOverview`와 기본 대분류 병합 view model 추가.
- [x] `cards`/`card_sets` 집계는 Supabase row 반환 길이가 아니라 게임별 exact count 쿼리(`head: true`, `count: exact`)를 우선 사용.
- [x] `lib/tcg-data.ts`의 fake `tcgCategories` 제거.
- [x] `/categories`를 Supabase 집계 기반 서버 페이지로 전환하고, 조회 실패 시 빈 상태 fallback 제공.
- [x] 포켓몬/유희왕/매직은 기존 카테고리 이미지를 재사용하고, 원피스는 임시 해상 visual fallback으로 표시.
- [x] 대분류 카드에서 카드/세트/가격 기록 0 값을 그대로 노출.
- [x] `app/categories/page.test.tsx`, `lib/tcg-catalog.test.ts` 갱신.
- [x] `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build` 검증.
- [x] dev 서버 `http://localhost:3000/categories`에서 4개 대분류 타일, 0 값, console error/warning 없음 확인.

### 4.20 가격 데이터 신뢰도/환율/차트 운영 계획

- 영향 파일: `memory-bank/prd/plan.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, `memory-bank/db-schema.md`, `memory-bank/architecture.md`, `memory-bank/trouble-shooting.md`, `memory-bank/price-source-validation.csv`, `lib/pricing/**`, `lib/tcg-catalog.ts`, `app/cards/[cardId]/page.tsx`, `scripts/collect-prices.ts`, `scripts/sync-price-worklist.ts`, `.env.example`, `supabase/migrations/202606030001_add_fx_price_display.sql`, Supabase MCP/CLI migration 기록.
- 최소 변경 범위: 한국판 카탈로그는 현재 약 3,600개로 충분하므로 증설하지 않는다. 가격 데이터는 sold/asking을 분리하고, 자동으로 확실히 가져올 수 있는 eBay Browse asking daily snapshot을 P0 trend source로 둔다. sold는 검증 가능한 수동 CSV 또는 승인된 partner/API source만 사용한다. USD 등 외화 가격은 원천 통화와 원천 금액을 보존하고 기준일 환율로 KRW 표시값을 계산한다.
- [x] 제품 PRD의 데이터/가격 기준을 카탈로그 증설 제외, sold/asking 분리, FX 환산 필수 기준으로 갱신.
- [x] FX 저장 모델 SQL 작성: `exchange_rates`와 `card_price_snapshots`의 source/display 가격, `fx_rate_date`, `fx_provider` 컬럼, manual evidence source의 product id 중복을 허용하는 `price_observations` unique index 교체를 `supabase/migrations/202606030001_add_fx_price_display.sql`에 추가.
- [x] Supabase MCP migration `add_fx_price_display`로 FX/display 가격 확장을 원격 DB에 적용.
- [x] 한국수출입은행 환율 OpenAPI 기준 일별 rate fetch/import 코드와 테스트 추가.
- [x] `price_observations` 원천 통화 보존, `card_price_snapshots` source/display 가격 분리 코드 추가. 원격 DB가 FX 컬럼 적용 전이면 legacy snapshot upsert로 fallback한다.
- [x] 카드 상세 차트/요약 view model이 display 가격, 환율 기준일, sold/asking 구분, source, sample count, 데이터 부족 상태를 노출하도록 갱신.
- [x] `memory-bank/price-source-validation.csv` 수동 sold/asking 적재 실행: 1차로 현 원격 legacy schema 기준 sold 관측치 41건 insert, sold snapshot 43개 upsert, asking snapshot 6개 upsert. 2026-06-03 재적재에서 verified sold `parsed=109/resolved=109/snapshots=107`, asking `parsed=9/resolved=9/snapshots=5`를 확인하고, sold 관측치 66건 추가 insert, sold snapshot 107건, asking snapshot 5건을 upsert했다.
- [x] `KOREA_EXIM_FX_API_KEY` 설정 후 `scripts/collect-prices.ts --csv --csv-asking --fx`로 KRW display snapshot을 재적재하고, 기존 `source_item_id` unique index 때문에 보류된 manual KREAM grade별 관측치 2건을 추가 적재.
  - 실제 적재 중 영업일 fallback으로 같은 `rate_date`가 중복된 FX row가 한 batch에 들어와 exchange-rate upsert가 실패하던 문제를 `upsertExchangeRates` dedupe로 수정했다.
  - observation 재적재 중 source item/url bucket 중복 필터가 새 unique index와 정확히 맞지 않아 insert가 실패하던 문제를 item/url 양쪽 identity와 timestamp/price 정규화 기준으로 수정했다.
  - 최종 실행 결과 exchange-rate row 1,449개 upsert, sold observation 2건 추가, sold snapshot 107개 upsert, asking snapshot 5개 upsert. 원격 검증 결과 snapshot 112개 전부 display 가격 보유, FX 환산 snapshot 99개.
- [x] priority 카드 50~100개 수동 sold CSV 보강 workflow와 검증 체크리스트 작성.
  - `memory-bank/price-source-validation.csv`의 `sample_id`는 공식 한국 카드 번호 기반 `PKMKR-<card_num>`으로 통일한다. 기존 `KR-*` priority 번호는 `raw_payload_json.worklist_id`에 보존하는 alias이며, 검증 관측치가 확보된 sample은 실제 evidence 행으로 기록하고, 아직 부족한 sample만 `source_name=pending`, `exclude_reason=pending_evidence` 스켈레톤으로 둔다.
  - `pending_evidence` 행은 파서/집계가 건너뛰는 후보 행이다. source URL/item ID, 거래일, 원천 가격/통화, 상태/variant, `confidence_score >= 0.8` 근거가 채워지면 pending 행을 제거하고 실제 evidence 행만 남긴다.
  - 카드당 1차 목표는 raw sold 표본 3개 이상이다. 표본 3개 미만이거나 세트/번호/언어/상태가 충돌하면 “실거래 데이터 부족” 또는 observation only로 유지한다.
  - 증거 수집 순서는 KREAM/번개/중고나라/eBay sold 공개 표본을 사람이 확인하고, 자동화는 eBay Browse asking daily snapshot과 승인된 partner/API source만 허용한다.
- [ ] `KR-011`~`KR-060` 실제 sold 표본 보강.
  - [x] `KR-011`~`KR-019`, `KR-021`~`KR-027`, `KR-030`, `KR-031`: PriceCharting 개별 eBay completed-sale 행 기준 카드당 raw sold 3건 기록.
  - [x] `KR-036`, `KR-037`, `KR-039`: PriceCharting 개별 eBay completed-sale 행 기준 카드당 raw sold 3건 기록.
  - [ ] `KR-020`, `KR-028`, `KR-029`, `KR-032`~`KR-035`, `KR-038`, `KR-040`~`KR-060`: 공개 source raw sold 3건 미만 또는 직접 확인 미완료로 pending 유지.
- [x] 전체 한국판 포켓몬 카탈로그 pending worklist 확장.
  - Supabase `card_printings` 기준 한국판 프린팅 3,668개 중 기존 CSV에서 카드 identity로 이미 커버된 476개를 제외하고 `PKMKR-<external_ids.card_num>` sample id의 `pending_evidence` 행 3,192개를 추가했다.
  - `PKMKR-*` 행은 실제 sold evidence가 아니라 증빙 대기 행이다. `source_name=pending`, `exclude_reason=pending_evidence`라 parser/import/snapshot 집계에서 제외된다.
  - `scripts/sync-price-worklist.ts`는 CSV와 원격 한국판 카탈로그를 대조해 누락된 `PKMKR-*` pending 행만 추가한다. 후속 실제 evidence row가 `PKMKR-*`를 사용할 수 있도록 `getSampleIdToPrintingId`가 `external_ids.card_num` fallback 매핑을 제공한다.
- [x] `price-source-validation.csv` sample id canonicalization.
  - 기존 `KR-001`~`KR-060` evidence/pending 행 152개를 `PKMKR-<card_num>`으로 변환하고, 기존 번호는 `raw_payload_json.worklist_id`로 보존했다.
  - 실제 evidence가 없고 세트/번호/희귀도 잠정값이던 `KR-061`~`KR-110` pending skeleton 50개는 제거했다. 해당 카드는 전체 카탈로그 `PKMKR-*` pending backlog에서 공식 `card_num` 기준으로 추적한다.
  - CSV 검증 결과 data row 3,344개, malformed row 0개, `KR-*` sample id 0개.
- [x] 수동 CSV sold snapshot source 보존과 sold/asking 분류 정리.
  - `scripts/collect-prices.ts --csv`는 sold 관측치를 source별로 집계해 `ebay_sold`, `pricecharting_ebay_sold`, `manual_kream`, `manual_bunjang` 같은 원천을 `card_price_snapshots.source_name`에 보존한다.
  - 상세 차트는 `aggregation_method`를 우선해 `manual_asking_median`/`*_asking_median`은 asking trend, `median_filtered`는 sold series로 분류한다. 따라서 같은 `source_name=manual_bunjang`라도 판매중 호가와 판매완료 evidence가 섞이지 않는다.
- [ ] 배포 후 eBay Browse daily collection이 최소 7일 이상 누적되는지 확인.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.

### 4.21 카테고리 추천순 가격 데이터 우선 정렬

- 영향 파일: `lib/tcg-catalog.ts`, `lib/tcg-catalog.test.ts`, `memory-bank/prd/category.md`, `memory-bank/prd/search-results.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `/categories/pokemon`의 기본 `추천순`은 이름/slug 순이 아니라 가격 데이터가 있는 카드를 먼저 보여준다. 가격 데이터가 있는 카드끼리는 최신 표시 가격의 `sampleCount`가 많은 순으로 정렬하고, 동률은 기존 slug 순서를 유지한다. 명시적 이름 정렬(`name-asc`, `name-desc`)은 기존 동작을 유지한다. 전체 후보/프린팅 snapshot 조회는 Supabase/Cloudflare URL 한도를 넘지 않도록 chunk 단위로 수행한다.
- [x] PRD에 기본 추천순 기준 요약 반영.
- [x] `getPokemonCategoryPageData`의 `best` 정렬을 가격 데이터 우선으로 변경.
- [x] 정렬 회귀 테스트 추가.
- [x] `pnpm exec vitest run lib/tcg-catalog.test.ts`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build`, Playwright `/categories/pokemon` 런타임 검증.

### 4.21 페이지 이동 성능 최적화

- 영향 파일: `app/categories/[categoryId]/page.tsx`, `lib/tcg-catalog.ts`, 관련 테스트, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, 필요 시 `memory-bank/trouble-shooting.md`.
- 최소 변경 범위: `/categories/pokemon` 이동이 느린 1차 원인은 route metadata와 본문 렌더가 카테고리 전체 데이터를 반복 조회하고, 기본 `추천순(best)`이 전체 포켓몬 카드와 전체 primary printing snapshot을 읽은 뒤 서버에서 정렬하기 때문이다. 이번 작업은 PRD의 추천순 기준(가격 데이터 우선, 표본 수 우선)을 유지하되, 메타데이터는 정적 문구로 처리하고, 추천순 목록은 가격 snapshot이 있는 후보를 먼저 작은 집합으로 조회한 뒤 부족분만 slug 순 fallback으로 채운다.
- [x] `generateMetadata`에서 `getPokemonCategoryPageData()` 호출 제거.
- [x] `best` 정렬 조회를 전체 catalog chunk scan + 전체 snapshot chunk fetch에서 snapshot 후보 기반 조회 + fallback pagination으로 변경.
- [x] 가격 데이터 후보와 fallback 후보가 중복되지 않도록 merge하고, 필터/검색/페이지네이션/이름 정렬 동작을 유지.
- [x] 성능 회귀 테스트 또는 기존 `lib/tcg-catalog` 테스트 갱신. 기존 view model/route 테스트와 runtime 측정으로 검증.
- [x] `pnpm exec vitest run lib/tcg-catalog.test.ts app/categories/[categoryId]/page.test.tsx`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test --run`, `pnpm build` 검증.

### 4.22 카드 판본 기본값/상세 선택

- 영향 파일: `lib/tcg-catalog.ts`, `lib/tcg-catalog.test.ts`, `app/cards/[cardId]/page.tsx`, `app/cards/[cardId]/page.test.tsx`, `app/categories/[categoryId]/CardResults.tsx`, `next.config.ts`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: 카드 목록/인기 카드의 기본 이미지는 한국판(`ko/KR`) printing 및 한국 포켓몬센터 이미지(`cards.image.pokemonkorea.co.kr`)를 우선 사용한다. 상품 상세는 기본 한국판으로 열고, 같은 카드에 일본판(`ja/JP`) 또는 미국판/북미판(`en/NA`) printing이 있으면 선택 UI를 노출한다. 선택 시 해당 `card_printing_id`의 이미지, 가격 요약, 가격 차트를 조회해 한국/일본/미국 시세가 섞이지 않게 한다.
- [x] 목록/인기 카드 이미지 fallback 우선순위를 한국판 printing 기준으로 정리.
- [x] 상세 route에서 `edition=kr|jp|na` 쿼리를 파싱하고 기본값을 `kr`로 둔다.
- [x] 상세 view model에 판본 옵션과 선택 판본 정보를 추가.
- [x] 선택 판본의 `card_printing_id` 기준으로 snapshot을 조회하고 차트/가격 요약을 계산.
- [x] 판본 선택 UI와 회귀 테스트 추가.
- [x] Supabase MCP로 기존 일본판 이미지 URL 8개를 한국 포켓몬센터 이미지 URL로 갱신하고 `cards`/`card_printings`를 검증.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.

### 5. 품질 게이트

- [x] `pnpm lint`
- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm test --run`
- [x] `pnpm build`

### 6. TCGround UI 라이브러리 + Docusaurus 문서화

- 영향 파일: `packages/ui/**`, `components/ui/**`, `apps/docs/**`, `.storybook/**`, `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `memory-bank/prd/headless-ui.md`, `memory-bank/architecture.md`, `memory-bank/progress.md`.
- 최소 변경 범위: 기존 TCGround 앱은 유지하고, `components/ui/*` shadcn 기반 공통 UI 컴포넌트만 `packages/ui` 패키지로 분리한다. `components/tcg/*`, `app/*`, `lib/tcg-*`는 앱 도메인/라우트 코드로 유지한다. 기존 headless primitive 직접 구현은 이번 방향에서 제외하고, Storybook은 `packages/ui` 라이브러리 컴포넌트 확인 도구로 좁힌다.
- [x] 기존 Headless UI 과제 1차 산출물 생성. (방향 전환으로 재작업)
- [x] 패키지 이름과 import 계약을 `@tcground/ui`로 정리.
- [x] `components/ui/*` 컴포넌트와 stories를 `packages/ui`로 이동하고 내부 import를 패키지 경계에 맞게 수정한 뒤, 기존 `components/ui` 중복 디렉터리 제거.
- [x] `packages/ui`가 필요한 UI 런타임 의존성(`radix-ui`, `cmdk`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)을 직접 선언.
- [x] 기존 앱이 필요한 공통 UI를 `@tcground/ui`에서 import하도록 전환.
- [x] Storybook stories 수집 범위를 `packages/ui` 중심으로 정리.
- [x] Docusaurus 문서를 새 패키지 이름과 styled UI 라이브러리 방향에 맞게 갱신.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build:ui`, `pnpm build-storybook`, `pnpm build:docs` 검증.

### 6.1 TCG 앱 Button 소비 전환

- 영향 파일: `packages/ui/src/components/ui/button.tsx`, `packages/ui/src/components/ui/button.stories.tsx`, `components/tcg/search/HomeSearchForm.tsx`, `components/tcg/layout/PublicHeader.tsx`, `components/tcg/auth/LoginForm.tsx`, `components/tcg/auth/SignupForm.tsx`, `app/login/page.tsx`, `app/cards/[cardId]/page.tsx`, `app/globals.css`, `apps/docs/docs/components/button.mdx`, `apps/docs/docs/theming.md`, `packages/ui/src/theme.css`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: `@tcground/ui` Button의 기존 variant API는 유지하고, TCG CTA 색상/크기 토큰과 앱 반복 size를 추가한다. 앱의 native action button은 `Button`으로 전환하되 검색 submit, 인증 submit, Link 라우팅, 차트 tab ARIA 동작은 유지한다.
- [x] Button default/outline/secondary/ghost/destructive/link 스타일을 TCG 토큰 기반으로 재정의.
- [x] Button size에 `search`, `auth`, `cta`, `tab`, `pill` 추가.
- [x] native button 기본 `type='button'` 동작과 explicit submit 동작 테스트 추가.
- [x] 검색/헤더/인증/상품 상세 action button을 `@tcground/ui` Button으로 전환.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build:ui`, `pnpm build-storybook`, `pnpm build:docs`, `pnpm build` 검증.

### 6.2 Button 기본 스타일 polish

- 영향 파일: `packages/ui/src/components/ui/button.tsx`, `packages/ui/src/components/ui/button.stories.tsx`, `apps/docs/docs/components/button.mdx`, `apps/docs/src/components/examples/button/default.tsx`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: Button API와 앱 특수 size는 유지하고, 설치 직후 `<Button>Save changes</Button>`만으로도 완성도 있게 보이는 clean solid 기본 스타일로 정리한다.
- [x] `default`, `sm`, `lg` size를 외부 소비자가 쓰기 좋은 compact baseline으로 조정.
- [x] 기본 variant와 `outline`/`secondary`/`ghost`/`destructive`/`link` 상태 스타일을 단순한 solid/flat 톤으로 정리.
- [x] Storybook 기본 args와 Docusaurus Basic example을 `Save changes` 예시로 갱신.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build:ui`, `pnpm build-storybook`, `pnpm build:docs`, `pnpm build` 검증.

### 6.3 Docusaurus Button preview style fix

- 영향 파일: `packages/ui/src/theme.css`, `apps/docs/src/css/custom.css`, `apps/docs/src/components/examples/{dialog,dropdown-menu,switch,tabs}/controlled.tsx`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: Button 문서 예시 MDX는 유지하고, Docusaurus에서 Tailwind 없이도 `@tcground/ui` 컴포넌트가 보이도록 package theme fallback과 docs token 참조만 보정한다.
- [x] `packages/ui/src/theme.css`에 현재 Button 마크업인 `[data-slot='button']` 대상 variant/size/focus/disabled fallback 추가.
- [x] Docusaurus dark theme에서도 같은 token contract를 쓰도록 `[data-theme='dark']` token 추가.
- [x] docs CSS와 controlled 예시의 오래된 `--pokemon-*` 토큰을 현재 `--card`, `--border`, `--radius`, `--muted-foreground` 기준으로 교체.
- [x] `pnpm build:docs`, `pnpm build:ui`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build-storybook` 검증.

### 6.4 Docusaurus API Reference table layout fix

- 영향 파일: `apps/docs/src/components/PropsTable.tsx`, `apps/docs/src/css/custom.css`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: API Reference 표가 본문 영역을 넘어 TOC와 겹치지 않도록 PropsTable 레이아웃과 긴 code wrapping만 조정한다.
- [x] `PropsTable`에 column group을 추가해 Prop/Type/Default/Description 폭 기준을 명시.
- [x] docs CSS에서 표를 `table-layout: fixed`와 `max-width: 100%` 컨테이너 기준으로 고정.
- [x] 긴 union type code는 줄바꿈하고, 모바일 폭에서는 표 컨테이너 내부 가로 스크롤로 처리.
- [x] `pnpm build:docs`, `pnpm lint`, `pnpm exec tsc --noEmit` 검증.

### 6.5 Docusaurus component preview fallback 정리

- 영향 파일: `packages/ui/src/theme.css`, `packages/ui/src/components/ui/button.tsx`, `apps/docs/docs/components/{dialog,dropdown-menu,tabs,switch}.mdx`, `apps/docs/src/components/examples/dropdown-menu/basic.tsx`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: Button과 같은 방식으로 Docusaurus 문서 미리보기에서 Tailwind 생성 없이도 주요 문서 컴포넌트 기본 스타일이 보이도록 `data-slot` fallback을 보강하고, 문서 예시를 현재 `@tcground/ui` named export API 기준으로 맞춘다.
- [x] `DialogContent`가 overlay와 close button을 포함하는 현재 구현 기준으로 MDX 예시와 API 설명 정리.
- [x] Dropdown Menu, Tabs, Switch 문서 예시를 실제 named export API 기준으로 정리.
- [x] `[data-slot='dialog-*']`, `[data-slot='dropdown-menu-*']`, `[data-slot='tabs-*']`, `[data-slot='switch*']` fallback 스타일 추가.
- [x] `Button`을 ref-forwarding 컴포넌트로 바꿔 `DropdownMenuTrigger asChild`가 Radix Popper anchor를 측정할 수 있게 수정.
- [x] `http://localhost:3001/components/dropdown-menu`에서 첫 trigger 클릭 시 menu content가 trigger 아래에 배치되는지 확인.
- [x] `pnpm build:docs`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build:ui`, `pnpm build-storybook` 검증.

### 6.6 `@tcground/ui` npm 공개 배포 준비

- 영향 파일: `packages/ui/package.json`, `packages/ui/README.md`, `memory-bank/prd/headless-ui.md`, `memory-bank/architecture.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: 기존 컴포넌트 API와 앱 소비 경로는 유지하고, `@tcground/ui`를 npm에 공개 배포할 수 있도록 package metadata, publish 설정, 배포 파일 목록, theme CSS export, README 사용법을 정리한다. 실제 `npm publish`는 npm organization 권한과 로그인 상태가 필요한 수동 단계로 남긴다.
- [x] `packages/ui/package.json`에서 npm 공개 배포용 metadata, `publishConfig`, `files`, `exports`, `prepack` 설정 정리.
- [x] build 시작 시 stale `dist`를 정리하고, build 결과에 `theme.css`가 포함되도록 CSS 복사 단계를 추가한 뒤 `@tcground/ui/theme.css` export를 배포 산출물 기준으로 전환.
- [x] `packages/ui/README.md`에 설치, 스타일 import, 기본 사용법, peer dependency, 배포 전 검증 명령을 문서화.
- [x] `pnpm build:ui`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm --filter @tcground/ui pack --dry-run` 검증.

### 6.7 TCGround 앱의 npm 배포본 소비 전환

- 영향 파일: `package.json`, `pnpm-lock.yaml`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`.
- 최소 변경 범위: npm registry에 공개된 `@tcground/ui@0.1.0`를 `tcground` 루트 앱에서 실제 설치 대상으로 쓰도록 dependency protocol만 `workspace:*`에서 semver range로 전환한다. `apps/docs`는 로컬 UI 패키지 문서/검증 사이트이므로 `workspace:*`를 유지한다.
- [x] npm registry에서 `@tcground/ui` 최신 버전 확인.
- [x] 루트 앱 dependency를 `@tcground/ui: ^0.1.0`으로 변경.
- [x] `pnpm install`로 lockfile을 npm 배포본 기준으로 갱신.
- [x] `node_modules/@tcground/ui`가 workspace symlink가 아니라 `.pnpm/@tcground+ui@0.1.0...` registry 설치본을 가리키는지 확인.
- [x] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test --run`, `pnpm build` 검증.

## 다음 작업

최우선 다음 단계는 `raw_payload_json.worklist_id` 기준 `KR-020`, `KR-028`, `KR-029`, `KR-032`~`KR-035`, `KR-038`, `KR-040`~`KR-060` priority pending worklist에서 카드별 source URL/item ID가 있는 sold 증거를 수동으로 채우는 것이다. CSV `sample_id`와 전체 카탈로그 pending backlog는 `PKMKR-*`로 보유하되, 증거가 확보된 카드만 실제 evidence 행으로 승격한다. eBay Browse daily asking series가 배포 후 최소 7일 이상 누적되는지 확인한다. Marketplace Insights(sold) 자동 수집과 국내 source 자동화는 접근 승인/재사용 권한 확인 전까지 보류한다. 이후 카드 상세의 "관심 카드 추가"/"가격 알림" placeholder 버튼을 `favorite_cards` 기반 실제 기능으로 구현한다.
