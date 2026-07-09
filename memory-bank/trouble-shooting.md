# TROUBLE SHOOTING

> PRD에 없던 엣지 케이스, 예외 상황, source 리스크 기록.
> 마지막 갱신: 2026-06-16 (KREAM segmented search 수집)

## KREAM/eBay daily cron은 실행되지만 snapshot이 적재되지 않음

### 문제

2026-06-16 `com.tcground.daily-price-collection` LaunchAgent는 실행 중이었고 로그도 갱신됐지만, `card_price_snapshots`에는 `ebay_browse`/`kream` snapshot이 0건이었다.

- 기존 `pnpm collect:daily`는 전체 4,677장을 한 번에 `--browse --kream --source-batch-size 100`으로 처리했다.
- eBay Browse는 장시간 실행 뒤 다수 batch가 `fetch failed`로 기록됐고 snapshot은 0건이었다.
- KREAM은 batch 시작 뒤 오래 걸리거나 500 응답이 반복됐고, 이전 실행은 run 기록 전후로 멈춘 것처럼 보였다.
- 현재 `.env.local`은 `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `EBAY_ENV=sandbox` 상태라 eBay production listing snapshot을 기대하기 어렵다.

### 처리

- `pnpm collect:daily`를 날짜별 50장 rotating window로 변경했다.
- `--daily-window-size` CLI 옵션을 추가해 매일 다른 catalog slice를 처리하도록 했다.
- eBay Browse fetch/OAuth 요청에 8초 timeout을 추가했다.
- `ebay_browse`는 연속 실패 10건, `kream`은 연속 실패 5건이면 해당 source batch를 abort하도록 했다.
- 기존에 KREAM batch에서 멈춰 있던 LaunchAgent를 `launchctl bootout`으로 내린 뒤 다시 bootstrap했다.
- `launchctl kickstart -k gui/501/com.tcground.daily-price-collection` 검증 결과 새 실행은 exit code 0으로 종료됐다.
- DB run 기록은 새 실행에서 `ebay_browse` 25장 batch 2개 `succeeded`, `kream` 25장 batch 1개 `partial`로 남았다. snapshot은 0건이며, 이는 eBay sandbox와 KREAM 500 응답 때문으로 분리해 본다.
- KREAM 검색 결과 페이지(`포켓몬카드 한글판`)는 실제 브라우저에서 상품 카드 DOM을 제공하므로 API 500 fallback으로 사용할 수 있음을 확인했다.
- `scripts/collect-kream-search-page.ts`를 추가해 렌더된 검색 페이지에서 product id, 상품명, 현재 표시가, 거래 수를 추출하고, 상품명+세트명+레어도 기준으로 동률 없는 confidence match만 `kream_search_page_asking` snapshot으로 저장한다.
- 2026-06-16 검증 결과 검색 결과 40개 중 12개가 안전 매칭됐고, `card_price_snapshots`에 `source_name='kream'`, `aggregation_method='kream_search_page_asking'`, `snapshot_date='2026-06-16'` 12건이 upsert됐다.
- 이후 단일 검색어가 약 50개만 노출되는 한계를 확인해, `collect:kream:daily`를 catalog 세트명/세트명+레어도 검색어를 순회하는 segmented search로 바꿨다. 각 검색 결과는 product id 기준으로 합치고, 기존 안전 매칭을 통과한 상품만 snapshot으로 저장한다.
- KREAM은 반복 자동 접근 후 headless/headed 브라우저 모두에 500/빈 응답을 간헐적으로 반환할 수 있다. 이 경우 스크립트는 검색어별 timeout 뒤 다음 segment로 넘어가며, 상품 link가 끝내 없으면 0건으로 종료한다. 앞선 성공 실행에서 적재된 기존 snapshot은 지우지 않는다.

### 재발 방지

- daily cron은 전체 카탈로그를 한 번에 돌리지 않는다. 전체 재수집이 필요하면 `--offset`, `--limit`, `--source-batch-size`로 작은 window를 수동 실행한다.
- launchd 검증은 `launchctl print`, `/tmp/tcground-daily-price-collection.out.log`, `price_collection_runs`를 같이 본다.
- eBay Browse 실데이터 적재를 기대할 때는 `.env.local`/배포 환경이 production eBay keyset과 `EBAY_ENV=production`인지 먼저 확인한다.
- KREAM API 500이 반복되면 JSON API 기반 수집은 partial로만 기록하고, 렌더된 검색 페이지 fallback 또는 product id 매핑 기반 수동 evidence 경로를 우선한다.
- 검색 페이지 fallback은 현재 표시가/호가만 저장한다. 체결(sold)로 승격하지 않는다.
- 검색 페이지 fallback이 0건으로 끝난 날에는 `/tmp/tcground-daily-price-collection.out.log`를 확인해 KREAM 차단/빈 응답인지, 실제 검색 결과 변경인지 구분한다.
- segmented search는 KREAM이 제공하는 검색 결과 표면을 넓히는 fallback이다. KREAM이 자동 브라우저에 빈 응답을 주는 날에는 단일 검색/segmented 검색 모두 0건일 수 있다.

## 상세 페이지 eBay on-demand 갱신과 로컬 권한 fallback

### 문제

2026-06-15 상품 상세 진입 시 eBay Browse on-demand 갱신에 타임아웃이 없으면 eBay/OAuth 네트워크 지연이 상세 렌더를 붙잡을 수 있었다. 로컬 검증 환경에서는 `SUPABASE_SERVICE_ROLE_KEY`가 price snapshot 쓰기 권한을 갖지 못해 `card_price_snapshots` permission denied가 브라우저 콘솔 경고로 노출됐다.

같은 검증에서 게스트 상세 페이지의 `card_ratings` 직접 조회가 permission denied를 반환하면 평점 Suspense 영역이 에러로 깨지는 현상도 확인했다.

### 처리

- `lib/pricing/ebay/current-asking.ts`의 기본 fetch에 3.5초 abort timeout을 추가하고, 실패 시 기존 snapshot 표시로 fallback하게 했다.
- on-demand refresh에서 Supabase permission denied는 `skipped`로 처리해 상세 페이지를 깨뜨리지 않게 했다. 실제 eBay 현재 호가 저장은 `.env.local`/배포 환경의 service role key가 올바를 때만 동작한다.
- `getViewerRating`은 permission denied를 “내 평점 없음”으로 fallback한다. 공개 평균은 기존 RPC 경로를 유지한다.

## 로컬 Supabase 복원 후 카드 목록이 0개로 보임

### 문제

2026-06-13 원격 public 데이터를 로컬 Supabase로 복원한 뒤에도 `/categories/pokemon`이 `포켓몬 0개 결과`와 빈 상태를 표시했다. 로컬 DB와 Supabase REST 직접 조회는 정상으로, `cards=4677`, `card_printings=4677`, `card_sets=42`가 확인됐다.

### 처리

- `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`이 로컬 Supabase URL을 가리키는지 확인했다.
- Supabase REST 직접 조회로 publishable key/RLS/API 경로가 정상임을 확인했다.
- 기존 Next dev 서버를 종료하고 `.next` 생성 산출물 전체를 `/private/tmp/tcg-next-before-local-data-full-20260613-card-list-debug`로 이동했다.
- `pnpm dev`를 재시작한 뒤 `/categories/pokemon` HTML에서 `포켓몬 4,677개 결과`와 실제 카드 목록 렌더를 확인했다.

### 재발 방지

로컬 DB를 `supabase db reset` 또는 원격 dump restore로 크게 바꾼 직후 `unstable_cache` 기반 서버 데이터가 오래된 결과를 계속 표시하면, dev 서버 재시작만으로 부족할 수 있다. 이 경우 `.next` 생성 산출물을 삭제 또는 백업 이동한 뒤 dev 서버를 새로 띄우고, DB/API 직접 count와 페이지 HTML count를 같이 확인한다.

## 로컬 Supabase reset baseline migration 누락

### 문제

2026-06-13 로컬 Supabase reset/start 중 `202606030001_add_fx_price_display.sql` 적용 단계에서 `public.card_price_snapshots`가 없어 실패했다.

```text
ERROR: relation "public.card_price_snapshots" does not exist (SQLSTATE 42P01)
At statement: alter table public.card_price_snapshots ...
```

원인은 초기 MVP schema와 가격 수집 확장 schema가 과거 Supabase MCP migration으로 원격 프로젝트에만 적용됐고, 로컬 `supabase/migrations/`에는 후속 FX/display migration과 category counts migration만 있었기 때문이다. 로컬 reset은 빈 DB에 파일 migration만 순서대로 적용하므로, `card_price_snapshots`, `price_observations`, `card_printings`가 만들어지기 전에 후속 migration이 실행됐다.

### 처리

- `supabase/migrations/202605200001_create_local_baseline_schema.sql`를 추가해 현재 앱이 기대하는 public baseline schema를 빈 로컬 DB에 생성하도록 했다.
- baseline에는 `tcg_games`, `card_sets`, `cards`, `card_printings`, `card_categories`, `card_category_links`, `card_price_snapshots`, `price_observations`, `price_collection_runs`, `favorite_cards`, `card_ratings`, `get_card_rating_summary` RPC, 주요 index/RLS/grant를 포함했다.
- `supabase/config.toml`의 seed 경로(`./seed.sql`)가 항상 존재하도록 `supabase/seed.sql` placeholder를 추가했다.
- 검증 결과 `pnpm dlx supabase db reset`이 baseline → FX/display → category counts migration 순서로 완료됐다.
- 일반 `pnpm dlx supabase start`는 DB migration 적용 뒤 edge-runtime health check 502로 실패했다. DB reset 검증은 `pnpm dlx supabase start --exclude edge-runtime --ignore-health-check`로 로컬 stack을 띄운 뒤 수행했다.

### 재발 방지

- 원격 MCP로 schema를 변경했더라도 로컬 reset이 필요해지는 순간에는 파일 migration baseline 또는 동일 변경 migration을 함께 남긴다.
- 후속 migration이 기존 테이블을 `alter`하거나 함수 SQL body에서 참조할 때는, 빈 로컬 DB에 선행 테이블 생성 migration이 있는지 확인한다.
- 로컬 Supabase health check 실패와 SQL migration 실패를 분리해서 본다. migration 로그가 모두 통과한 뒤 edge-runtime 502가 발생하면 schema 문제가 아니라 컨테이너 기동 문제로 기록한다.

## Vercel main 배포가 최신 커밋을 반영하지 않음

### 문제

2026-06-05 PR #5가 `main`에 merge됐지만 production URL이 최신 화면을 반영하지 않았다. GitHub 원격 `main` 최신 SHA는 `96424b89618794f7256b73e0ede0834f4e9c4c8f`였고, PR #5 merge 시각은 `2026-06-05T12:21:52Z`였다.

Vercel 최신 production 배포는 `tcground-ojt264nfx-devjerryb-2567s-projects.vercel.app`로 `Ready` 상태였고 `tcground.vercel.app` alias도 붙어 있었다. 하지만 해당 배포 build log에는 다음처럼 이전 main 커밋이 기록됐다.

```text
Cloning github.com/jihyeon-songb/tcground (Branch: main, Commit: dfb2680)
```

즉 production 배포는 존재했지만 최신 merge commit `96424b8`이 아니라 이전 main 커밋 `dfb2680`을 다시 빌드한 상태였다. 최근 preview 배포들도 `refactor/component-structure`의 `d3e6ff0` 또는 `feat/card-list-page`의 `401da66`까지였고, merge commit `96424b8` 배포는 확인되지 않았다.

### 처리

- Vercel CLI로 `tcground` 프로젝트의 최근 deployment를 조회했다. 최신 production은 `2026-06-05 21:50:08 KST` 생성, `Ready`, production alias 연결 상태였다.
- `vercel inspect ... --logs`로 최신 production이 `dfb2680`을 clone/build/deploy한 것을 확인했다.
- GitHub API에서 최신 `main` commit status/check run/deployments를 확인했지만 `96424b8`에 check run 0개, deployment 0개였다.
- GitHub Actions도 없었다. `workflow_runs=0`, `.github/workflows` 없음.
- `/private/tmp/tcg-round-main`에 `origin/main` archive를 풀고 `pnpm install --filter=tcg-round... --frozen-lockfile`, `pnpm build`를 실행해 최신 main 소스 자체는 빌드 통과함을 확인했다.

### 재발 방지

- Vercel에서 이전 deployment의 "Redeploy"를 누르면 현재 `main` HEAD가 아니라 해당 deployment의 원래 commit을 다시 배포할 수 있다. 최신 main 반영이 목표면 GitHub push/merge trigger로 생성된 `96424b8` deployment를 promote하거나, 최신 main checkout에서 새 production deploy를 실행한다.
- 배포 후 `vercel inspect <production-url> --logs`의 `Branch`/`Commit` 줄을 확인해 production alias가 기대 SHA를 가리키는지 검증한다.
- GitHub PR merge 후 Vercel deployment/check가 생성되지 않으면 Vercel Project Git 설정의 connected repository, production branch, ignored build step, GitHub App 권한을 확인한다.

## UI 패키지 npm publish 권한과 버전 충돌

### 문제

2026-06-05 `@tcground/headless`/`@tcground/ui` ESM 산출물 보강 후 실제 npm 배포와 루트 앱 registry 소비 갱신을 시도했다. registry 조회 결과 목표로 삼았던 `@tcground/headless@0.1.1`과 `@tcground/ui@0.1.2`는 이미 존재했다. 하지만 설치된 `@tcground/ui@0.1.2`는 이전 산출물이라 다음 문제가 있었다.

- `dist/index.js`가 `./components/ui/alert`처럼 extensionless re-export를 포함해 `node import('@tcground/ui')`가 `ERR_MODULE_NOT_FOUND`로 실패했다.
- package manifest의 `@tcground/headless` dependency가 publish 가능한 semver가 아니라 `workspace:^`로 남아 있었다.
- npm은 같은 version을 덮어쓸 수 없으므로 `@tcground/ui@0.1.2`를 수정본으로 재배포할 수 없다.

수정본 배포를 위해 `@tcground/headless@0.1.2`로 patch bump 후 `npm publish --access public`을 시도했지만 현재 환경의 npm 인증/권한도 부족했다.

- `npm whoami`: E401 Unauthorized.
- `npm publish --access public` from `packages/headless`: `PUT https://registry.npmjs.org/@tcground%2fheadless` E404.

### 처리

- 깨진 `@tcground/ui@0.1.2`를 루트 앱 dependency로 유지하지 않고, `pnpm-lock.yaml`과 `node_modules`를 기존 검증 상태인 `@tcground/ui@0.1.0`으로 복구했다.
- `vitest.config.mts`의 `@tcground/ui` local source alias와 root `tsconfig.json`의 `@tcground/headless` alias를 유지했다. 현재 published package가 Node/Vitest dependency import에서 실패하기 때문이다.
- 로컬 source에는 `.js` extension specifier 보강과 `@tcground/ui`의 semver dependency 보강을 유지한다.
- 2026-07-09 재개 후 `@tcground/headless@0.1.2`와 `@tcground/ui@0.1.3`을 npm에 공개 배포했다. `@tcground/ui@0.1.3`은 `@tcground/headless:^0.1.2`를 dependency로 선언하며, 임시 프로젝트에서 두 패키지 설치와 Node ESM import를 확인했다.

### 재발 방지

- npm publish 전에는 `npm whoami`와 `npm access ls-packages @tcground` 또는 organization 권한을 먼저 확인한다.
- 이미 존재하는 버전에 문제가 있으면 같은 version을 재사용하지 않고 patch version을 올린다.
- 배포 순서는 `@tcground/headless`를 먼저 publish한 뒤, `@tcground/ui`를 새 headless semver dependency로 publish한다.
- root dependency를 registry 소비로 전환할 때는 `pnpm add -w @tcground/ui@^0.1.3`, `node import('@tcground/ui')`, `pnpm test --run`을 확인한 뒤에만 Vitest alias를 제거한다.

## KREAM 로그인 수동 수집 중 상세 접근/카탈로그 매칭 한계

### 문제

2026-06-05 로그인된 Playwright 세션에서 KREAM `포켓몬카드 한글판` 검색 결과를 수집했다. 검색 결과에서는 product link 2,045개와 거래 표시 상품 272개가 확인됐지만, 상세 수집 중 다음 한계가 있었다.

- 검색 페이지 DOM에 유지된 거래 상품은 246개였고, 이 중 176개 상품에서 체결 446건을 읽었다.
- 최신/상위 상품 일부는 상세 HTML fetch가 상품 상세가 아니라 `KREAM | 한정판 거래의 FLEX` 기본 페이지를 반환했다.
- 일부 직접 상세 접근은 HTTP 500 또는 `/login` 리다이렉트로 바뀌어 추가 수집이 중단됐다.
- KREAM 모델번호는 `S6A085-069`, `M1L090-063` 같은 일본/국제 세트 코드 기반인 반면, 현재 CSV 카탈로그는 공식 한국 `PKMKR-BS...`와 일부 `SV*`/`S*` 코드가 섞여 있어 모델번호만으로는 176개 중 2개만 확실히 매칭됐다.

### 처리

- 확실히 매칭된 `803225` 이브이 ex SAR 테라스탈 페스타 ex `SV8A223-187` PSA 10 130000원(2026-05-08), `804730` 파이리 AR 포켓몬 카드 151 `SV2A168-165` BRG 9 영문 50000원(2026-05-13)만 `manual_kream` CSV 행으로 추가했다.
- 수집 산출물은 `memory-bank/kream-scrape/kream-search-links.json`, `memory-bank/kream-scrape/kream-product-details.json`, `memory-bank/kream-scrape/kream-matching-report.json`에 보존했다.
- 카탈로그 미등록/미매칭 174개 상품 444건과 접근 실패 70개 상품은 `memory-bank/kream-worklist-inbox.md`에 보류 상태로 기록했다.
- 재로그인 후 Playwright로 상위 30개 상품 상세를 직접 열어 196건을 읽었고, Supabase `card_printings` 조회로 sample_id를 확정할 수 있는 18개 상품 115건을 재매칭했다. 이 중 CSV에 이미 있던 58건은 중복으로 건너뛰고 57건을 추가했다.
- 최초에 2건만 CSV에 들어간 직접 원인은 KREAM 모델번호를 기존 CSV에 이미 있던 카드 메타데이터와만 대조했기 때문이다. MEGA 신세트와 구세대 S/SM/CP 계열은 CSV에 sample metadata가 없어 확실 매칭에서 제외됐다.
- `79041` 기라티나 V는 worklist에서 110/100 vs 111/100 모호 상태였지만, KREAM 모델번호 `S11111-100`과 Supabase 조회 결과를 대조해 `collector_number=111/100`, `external_ids.card_num=BS2022014110`, `sample_id=PKMKR-BS2022014110`으로 확정했다.
- 남은 unresolved 160개 중 현대 세트 후보(`M*`, `SV*`, `S10~S12`, `S6~S9`) 80개를 Supabase MCP로 재조회했다. `card_printings.set_code`, `collector_number`, `language='ko'`, `region='KR'`이 모두 일치한 14개 상품 25건만 `memory-bank/kream-scrape/kream-supabase-resolved-modern-inbox-20260605.json`을 거쳐 CSV에 승격했다.
- 이번 재대조에서 DB에 없는 시크릿/프로모/구세대 프린팅, KREAM 세트코드와 Supabase 세트코드가 일치하지 않는 후보, 상품 박스/세트류는 CSV에 넣지 않았다. 확인된 행만 추가한 뒤 `scripts/collect-prices.ts --csv --dry-run`으로 `parsed=294`, `resolved=294`, `snapshots=281`을 확인했다.

### 재발 방지

- KREAM 수집은 한 번에 200개 이상 상세를 반복하지 않고, 로그인 상태를 확인하면서 40개 이하 배치로 나눈다.
- 최신 MEGA/구세대 S·SM·CP 계열 카탈로그가 보강되기 전에는 KREAM 수집 결과를 CSV에 강제 매칭하지 않는다.
- KREAM unresolved를 재대조할 때는 `set_code + collector_number + ko/KR`이 모두 맞는 행만 확정으로 본다. 카드명만 맞거나 collector number만 맞는 후보는 worklist에 남긴다.
- KREAM product id와 모델번호를 `card_printings.external_ids` 또는 별도 매핑 파일에 축적한 뒤, 확실한 `sample_id`가 있을 때만 `manual_kream` evidence로 승격한다.
- `/login` 리다이렉트가 발생하면 즉시 수집을 중단하고 재로그인 후 남은 product id만 재시도한다.
- 중복 방지는 `source_item_id`, `sold_price`, `sold_at` 날짜, `grade_company`, `grade_value`, `variant` 조합으로 확인한다. 같은 KREAM product의 같은 가격/등급/일자 체결은 재실행 시 추가하지 않는다.

## 중고나라 검색어/필터링 이슈

### 문제

2026-06-05 중고나라 공개 검색 페이지는 `keyword=리자몽 ex 201/165`처럼 collector number를 포함하면 결과가 0건이 되는 경우가 있었다. 반면 `keyword=리자몽 ex`는 결과가 나오지만 세트/해외판/메가리자몽/포켓 앱 카드/박스/일괄 판매가 많이 섞인다.

### 처리

- `joongna` source는 검색어를 카드명 중심으로 만들고, snapshot 생성 단계에서 `computeMatchConfidence`로 카드명/세트/번호 일치도를 본다.
- 중고나라 전용 제외어로 박스, 팩, 미개봉, 일괄, 각개, 세트, 해외판, 포켓 앱 카드, 서플라이성 행을 제외한다.
- `joongna`는 `asking` source로만 분류하고 `aggregation_method='joongna_asking_median'`으로 저장한다. 실거래가 또는 sold evidence로 승격하지 않는다.
- 원문 HTML 전체, 판매자/스토어 식별 정보, 위치 정보는 저장하지 않고 상품 seq 기반 URL, 제목, 가격만 snapshot 집계에 사용한다.

## eBay scrape 전체 실행 브라우저 context 종료

### 문제

2026-06-05 production eBay Browse 전환 없이 `scripts/collect-prices.ts --bunjang --ebay-scrape` 실제 쓰기를 실행했다. Bunjang은 전체 카탈로그를 처리해 26개 asking snapshot을 생성했지만, eBay scrape는 장시간 실행 중 browser-backed fetch context가 종료되어 다수 카드가 `apiRequestContext.fetch: Target page, context or browser has been closed`로 실패했다. 최종 run은 `partial`, `observations_inserted=0`, `snapshots_created=0`으로 기록됐다.

### 처리

- KREAM은 사전 제한 dry-run에서 5/5 `KREAM search failed (500)`라 전체 쓰기에서 제외했다.
- eBay Browse는 `EBAY_ENV=sandbox`라 production listing snapshot을 기대할 수 없어 제외했다.
- 확실히 쓰기 가능한 source로 Bunjang 26개 snapshot을 생성했고, 검증 CSV sold/asking+FX 재적재를 실행해 기존 evidence snapshot을 최신 display/source 기준으로 upsert했다.
- `scripts/collect-prices.ts`에 `--offset`, `--limit`, `--source-batch-size`를 추가해 실패 window를 다시 실행할 수 있게 했다.
- source batch마다 CLI progress를 출력하고, 실제 실행 시 `price_collection_runs.metadata.batch`에 `cardStart`, `cardEnd`, `cardCount`, `batchIndex`, `batchCount`, `sourceBatchSize`를 기록한다.
- browser context 종료 오류가 감지되면 같은 닫힌 context로 나머지 전체 카탈로그를 계속 처리하지 않고 해당 batch에서 abort한다.
- 2026-06-05 `--ebay-scrape --offset 0 --limit 50 --source-batch-size 50` 실제 재시도 결과 run은 `succeeded`였지만 첫 50장에는 매칭된 sold observation/snapshot이 없어 `ebay_scrape` count는 0/0이었다.
- 2026-06-05 `--ebay-scrape --offset 50 --limit 50 --source-batch-size 50` 실제 재시도 결과도 run은 `succeeded`였지만 observation/snapshot은 0/0이었다. 최신 `price_collection_runs` metadata는 `cardStart=50`, `cardEnd=99`, `aborted=false`, `failures=[]`로 정상 기록됐다.
- 이어 live HTML을 점검하니 eBay 검색 결과 markup이 기존 `li.s-item`/`s-item__price`/`s-item__caption--signal`에서 `li.s-card` 계열로 바뀐 응답이 있고, eBay browser verification page가 HTTP 200으로 내려오는 경우도 있었다. 기존 파서는 두 경우 모두 빈 결과처럼 처리할 수 있었다.
- `lib/pricing/ebay/scrape-adapter.ts`에 `s-card` title/price/link/sold date parsing과 한국식 날짜 fallback을 추가하고, `splashui`/browser verification HTML은 `eBay sold scrape blocked by browser verification page` 오류로 던지게 했다. 수정 후 `--ebay-scrape --dry-run --offset 50 --limit 2 --source-batch-size 2`는 verification page를 `failed`로 드러낸다.

### 재발 방지

- eBay scrape 전체 3,600개 순회는 단일 장시간 실행으로 두지 말고 `--offset`, `--limit`, `--source-batch-size 50~100` 조합으로 나눠 실행한다.
- 실패 batch만 재시도할 때는 latest run metadata의 `cardStart`/`cardCount`를 기준으로 같은 window를 다시 실행한다.
- KREAM 500처럼 제한 dry-run에서 전면 실패하는 source는 전체 쓰기에 포함하지 않는다.
- eBay scrape가 succeeded/0으로 끝난 batch가 2개 이상 이어지면 추가 window 재시도보다 live HTML probe, `s-card` selector, browser verification/captcha detection, match confidence threshold를 먼저 점검한다.
- browser verification이 반복되면 headless `context.request.fetch` 기반 scrape로는 sold evidence 수집이 막힌 상태로 보고, priority 카드 28장은 CSV evidence 보강 또는 별도 priority window/source 옵션으로 좁혀 처리한다.

## 로컬 dev 서버 lock과 포트 혼선

### 문제

2026-06-05 런타임 검증 중 `pnpm dev`가 기존 Next dev 서버 PID를 감지하고 종료됐지만, `localhost:3000`은 실제로 응답하지 않았다. 별도로 시도한 `localhost:3002`는 이 프로젝트가 아니라 다른 Express/CRA 앱을 반환했다.

### 처리

- stale Next dev PID를 종료한 뒤 `pnpm exec next dev -p 3003`으로 충돌 없는 포트에서 서버를 재기동했다.
- `curl -I http://localhost:3003/categories/pokemon`로 `X-Powered-By: Next.js`와 200 응답을 먼저 확인한 뒤 Playwright 검증을 진행했다.

### 재발 방지

- 브라우저 검증 전에는 포트가 이 프로젝트의 Next 응답인지 `curl -I`로 확인한다.
- `Another next dev server is already running`이 나오지만 해당 포트가 응답하지 않으면 stale PID를 정리하고 다른 포트를 명시해 실행한다.

## 전체 가격 수집 dry-run source 분리

### 문제

2026-06-05 `scripts/collect-prices.ts --dry-run` 전체 실행 검증 중 두 가지 문제가 확인됐다.

1. 전체 dry-run은 활성 source와 전체 카탈로그를 한 번에 처리하지만 종료 전까지 중간 로그가 없어, 브라우저 warmup 또는 source 처리 중 장시간 무출력으로 보인다.
2. 브라우저 source(KREAM/eBay scrape)를 위해 생성한 browser-backed `fetch`가 eBay Browse, Guardian, Bunjang 같은 비브라우저 source에도 전달됐다. 그 결과 eBay OAuth token 요청이 브라우저 컨텍스트에서 실행되며 `unsupported_grant_type` 오류가 발생했다.

제한 dry-run 결과도 source별로 갈렸다.

- `--browse --dry-run --limit 5`: eBay Browse API 접근은 성공했지만 현재 `EBAY_ENV=sandbox`라 snapshot은 0개였다.
- `--dry-run --limit 2`: eBay Browse, Bunjang, eBay scrape는 실패 없이 종료했고, Guardian TCG는 한국 카드 표본에서 404, KREAM은 검색 API 500으로 실패했다.

### 처리

- `scripts/collect-prices.ts`에 검증용 `--limit N` 옵션을 추가하고, `collectDailyPrices`에 `cardLimit` 옵션을 연결했다. `--limit`을 주지 않으면 기존처럼 전체 카탈로그를 처리한다.
- 브라우저 fetch는 `requiresBrowser` source인 KREAM/eBay scrape에만 전달하고, eBay Browse/Guardian/Bunjang은 Node 기본 fetch를 쓰도록 수정했다.
- Supabase row count로 dry-run이 쓰기를 하지 않았음을 확인했다: `card_price_snapshots=112`, `price_observations=109`, `price_collection_runs=2`, `exchange_rates=1449`.

### 재발 방지

- 전체 수집 전에는 `--limit` dry-run으로 source별 접근 가능성과 실패 원인을 먼저 확인한다.
- production asking 수집 전 `EBAY_ENV=production`과 production keyset을 확인한다. sandbox에서는 실가격 snapshot 적재를 기대하지 않는다.
- KREAM/Guardian처럼 표본 dry-run에서 반복 실패하는 source는 실제 전체 쓰기 전에 플래그를 끄거나 접근 경로/쿼리 매핑을 해결한다.
- browser-backed fetch는 anti-bot 우회를 위해 필요한 source에만 주입하고, OAuth/API source에는 기본 fetch를 유지한다.

## FX 재적재 중 batch 내부 중복 upsert 실패

### 문제

2026-06-05 `scripts/collect-prices.ts --csv --csv-asking --fx` 실제 재적재 중 두 단계에서 중복 conflict가 발생했다.

1. `exchange_rates` upsert가 `ON CONFLICT DO UPDATE command cannot affect row a second time`로 실패했다. 한국수출입은행 API는 휴일/주말 요청 시 직전 영업일 환율을 반환할 수 있어, 여러 요청 날짜가 같은 `(base_currency, quote_currency, rate_date, provider)` row를 만들었다.
2. `price_observations` insert가 `price_observations_source_item_bucket_unique_idx` 중복으로 실패했다. 기존 중복 필터는 source item id를 우선하고 URL은 fallback으로만 봤으며, DB에서 반환된 `sold_at`/`sold_price` 포맷과 신규 row 포맷 차이도 정규화하지 않았다. 새 unique index는 source item과 source URL을 각각 독립 unique bucket으로 보므로 필터 기준이 완전히 같아야 한다.

### 처리

- `upsertExchangeRates`가 upsert 전 `(baseCurrency, quoteCurrency, rateDate, provider)` 기준으로 batch를 dedupe하도록 수정했다.
- observation identity를 `source_item_id`와 `source_url` 양쪽에 대해 모두 생성하고, `sold_at`은 ISO timestamp로, `sold_price`는 numeric string으로 정규화하도록 수정했다.
- `lib/pricing/collect-prices.test.ts`에 exchange-rate batch dedupe와 source URL bucket 중복 필터 회귀 테스트를 추가했다.
- 재실행 결과 exchange-rate row 1,449개 upsert, sold observation 2건 insert, sold snapshot 107개 upsert, asking snapshot 5개 upsert로 완료됐다.

### 재발 방지

- provider가 휴일 fallback을 제공하는 환율/가격 API는 요청 날짜와 응답 기준일이 다를 수 있으므로 DB unique key 기준으로 저장 전 dedupe한다.
- 수동 source가 product id와 URL을 동시에 제공하는 경우, 둘 중 하나만 중복 확인하지 않고 실제 unique index마다 identity를 계산한다.

## FX display 컬럼 미적용 상태에서 가격 snapshot upsert 실패

상태: 2026-06-05 Supabase MCP migration `add_fx_price_display` 적용으로 원격 DB의 FX/display 컬럼과 unique index 교체는 완료됐다. 이 항목은 migration 적용 전 발생한 이슈의 기록이며, 현재 남은 작업은 `KOREA_EXIM_FX_API_KEY` 설정 후 `--fx` 재적재를 실행하는 것이다.

### 문제

2026-06-03 수동 가격 CSV 실제 적재 중 `card_price_snapshots` upsert가 `Could not find the 'display_avg_price' column of 'card_price_snapshots' in the schema cache`로 실패했다. 원인은 코드가 FX/display 확장 컬럼을 포함한 snapshot row를 만들었지만, 현재 작업 환경에 Supabase MCP와 Supabase CLI가 없어 원격 DB에 `supabase/migrations/202606030001_add_fx_price_display.sql`을 아직 적용하지 못했기 때문이다.

첫 실행은 sold CSV parsing/resolution 후 `price_observations` 41건 insert까지 성공했고, snapshot upsert에서 중단됐다. parsed/resolved sold 행은 43건이지만, 현재 원격 DB의 기존 `price_observations_source_item_unique_idx`가 `source_name + source_item_id`만 unique로 보아, 같은 KREAM product id(`804751`) 안의 grade별 체결 행 2건을 추가 관측치로 저장할 수 없다.

### 처리

- `upsertSnapshots`에 display/source/FX 컬럼 schema cache 오류 감지 시 legacy snapshot row로 재시도하는 fallback을 추가했다.
- 앱 snapshot 조회도 display 컬럼 select 실패 시 legacy select로 fallback한다. 2026-06-03 추가로 `schema cache` 문구 없이 `column card_price_snapshots.source_currency does not exist`로 반환되는 PostgREST 오류도 같은 fallback 대상으로 보강했다.
- 관측치 중복 기준은 source item/url + 거래일 + 가격 + grade bucket까지 보도록 바꿨다.
- migration SQL에는 기존 `source_item_id`/`source_url` unique index를 transaction bucket 기반 unique index로 교체하는 SQL을 추가했다.
- 재실행 결과 현재 legacy schema에서는 이미 들어간 41건을 건너뛰고, sold snapshot 43개와 asking snapshot 6개를 정상 upsert했다.

### 재발 방지

- schema 변경은 MCP/CLI만 허용하므로 직접 SQL 실행은 하지 않는다.
- FX migration 적용 전에는 legacy snapshot으로 가격을 먼저 적재하고, 앱 조회도 legacy select로 fallback한다.
- migration 적용 후에는 `KOREA_EXIM_FX_API_KEY`를 설정하고 `scripts/collect-prices.ts --csv --csv-asking --fx`로 KRW display snapshot과 보류된 manual KREAM grade별 관측치 2건을 재적재한다. 2026-06-05 기준 migration은 적용됐지만 `.env.local`에 FX API 키가 없어 `--fx --dry-run`은 `Korea Eximbank FX import requires KOREA_EXIM_FX_API_KEY`에서 중단된다.

## 시세 신뢰도: 네이버 제거 + eBay/KREAM 브라우저 수집 전환

### 문제

네이버 쇼핑(`naver_shopping`) 수집은 키워드 검색 결과를 관련성 검증 없이 전부 적재해, 한 카드의 raw 버킷에 서로 다른 상품이 섞였다. 실제 `블래키 ex`(테라스탈 페스타) raw 스냅샷이 `min 200원 / median 6,105원 / max 1,349,300원 / sample 88`로, 200원짜리 액세서리(슬리브 등)가 최저가를, 진짜 SAR 카드가 최고가를 오염시켰다. 표시 단계에서도 `formatKrw` 하드코딩으로 USD(eBay) 카드가 "₩"로 잘못 표기됐다.

### 처리

- **네이버 소스 제거**: `lib/pricing/naver/*` 삭제, `collect-prices` 러너·`ASKING_SOURCE_NAMES`에서 제거, `card_price_snapshots`/`price_collection_runs`의 `naver_shopping` 행(5,231 + 1) 삭제.
- **관련성 게이팅**: `lib/pricing/match-confidence.ts`로 리스팅 제목을 카드명(영/일/한)·번호·세트와 대조해 0..1 점수화. 액세서리 키워드(슬리브·토퍼·sleeve·lot of 등)는 0. eBay scrape와 KREAM 검색 해소가 이 점수를 confidence로 사용 → 집계(`aggregate.ts`)가 `< 0.70` + IQR로 떨궈 min/max 오염 제거.
- **신원 확정 수집**: KREAM은 한글명 검색 → `resolveKreamProduct` 최고매칭 product 체결가. eBay는 `_sacat`(CCG Individual Cards)로 카테고리 한정 + 영문/일문명 매칭. 영문/일문명은 `scripts/enrich-card-names.ts`가 TCGdex에서 `external_ids.name_en/name_ja`로 보강(JP 전용 세트는 영문 없음 → null).
- **통화 표시 수정**: 리스트/홈/`/cards`의 `formatKrw` → `formatPrice(value, currency)`.

### 데이터센터 IP 차단 (중요)

로컬 검증 결과 이 개발/Vercel 환경(데이터센터 IP, 비브라우저 `fetch`)에서는 **eBay `/sch`·`/itm` = 403, KREAM 홈·API = 500**으로 전면 차단된다(일반 망은 200, anti-bot이 IP+클라이언트로 차단). 따라서 eBay scrape·KREAM은 `lib/pricing/browser/browser-fetch.ts`(Playwright)로 실제 브라우저 세션을 띄워 **로컬/한국 IP의 `scripts/collect-prices.ts`에서만** 수집한다. `collectDailyPrices`는 fetch가 주입될 때만 `requiresBrowser` 소스를 실행하므로, Vercel Cron(주입 없음)에선 자동 제외된다. 실행 전 `npm install` + `npx playwright install chromium` 필요.

2026-06-15부터 KREAM asking까지 포함한 일일 로컬 수집은 `pnpm collect:daily`로 실행한다. 이 명령은 eBay Browse와 KREAM asking만 대상으로 하며, `scripts/launchd/com.tcground.daily-price-collection.plist`를 macOS LaunchAgent에 설치하면 매일 03:00 로컬 시간에 실행된다. Mac이 잠자기 상태이거나 한국/거주용 IP가 아니면 KREAM 쪽은 실패할 수 있으므로 `/tmp/tcground-daily-price-collection.err.log`와 `price_collection_runs`를 같이 확인한다.

### 재발 방지

키워드 검색 소스는 "신원 미확정 후보"로 취급한다. 적재 전 반드시 관련성 점수로 게이팅하고, 절대 극값(min/max)은 IQR 트리밍 후 산출한다. 새 스크래핑 소스는 데이터센터 IP에서 도달 가능한지 먼저 프로브하고, 막히면 브라우저 페처 경로로만 붙인다.

## Vercel 모노레포 install scope

### 문제

2026-05-26 pnpm workspace 모노레포로 전환하면서 root에 Next 앱, `packages/ui`(UI library), `apps/docs`(Docusaurus 3.9.2)가 함께 들어왔다. Vercel은 root `package.json`을 자동 감지해 Next 앱을 빌드하지만, 별도 설정이 없으면 `pnpm install`이 워크스페이스 전체를 hydrate한다. 결과적으로 Next 배포와 무관한 `apps/docs`의 Docusaurus deps(수백 개)까지 매 빌드마다 설치되어 빌드 시간이 늘고, `apps/docs`의 postinstall 또는 peer 충돌이 발생하면 Next 앱 배포까지 함께 실패할 수 있다.

### 처리

- root에 `vercel.json`을 추가해 install scope를 명시했다.

  ```json
  {
    "installCommand": "pnpm install --filter=tcg-round..."
  }
  ```

- `--filter=tcg-round...` (점 3개)는 root 패키지(`tcg-round`)와 *그 의존성 그래프*만 설치한다. 현재 Next 앱은 `@tcground/ui`를 import하므로 `packages/ui`는 Next 앱 의존성 그래프에 포함된다.
- `apps/docs`는 Next 앱의 의존성 그래프에 포함되지 않으므로 Vercel install에서 제외된다.

### 재발 방지

- 새 워크스페이스 패키지를 추가할 때 Next 앱(`tcg-round`)이 그 패키지를 import하지 않는다면, Vercel 빌드 install에서 자연스럽게 제외된다. 추가 설정 없음.
- 새 패키지가 Next 앱에서 import되어야 한다면 root `package.json`의 `dependencies`에 `"<패키지명>": "workspace:*"` 형태로 명시한다. 그래야 `--filter=tcg-round...`가 워크스페이스 그래프를 따라 포함시킨다.
- `.vercelignore`로 디렉터리 자체를 숨기는 방식은 추후 Next가 워크스페이스 패키지를 import하기 시작하면 파일 부재로 빌드가 깨지므로 사용하지 않는다.
- Vercel Node 버전은 `apps/docs`가 Docusaurus 3.9.2를 Node 22 기준으로 고정한 것과 별개로, root Next 앱 기준으로 본다. docs 사이트는 Vercel과 다른 호스팅 경로(예: GitHub Pages 또는 별도 Vercel 프로젝트)로 분리 배포한다.

## 배포 외부 이미지 전송량

### 문제

TCGdex 카드 이미지와 홈 카테고리 타일 이미지가 외부 원본 URL로 직접 렌더링되면 배포 환경에서 필요한 표시 크기보다 큰 이미지를 전송할 수 있다. 특히 목록/홈/인기 카드처럼 작은 카드 그리드에서는 `high.webp`를 그대로 받으면 초기 로드와 모바일 전송량이 커진다.

### 처리

- `next.config.ts`에 `assets.tcgdex.net`, `lh3.googleusercontent.com`만 remote image source로 허용하고, `next/image`가 `/_next/image` 최적화 경로를 사용하게 했다.
- 목록/홈/인기 카드 view model은 `cards.thumbnail_url`을 우선 사용해 TCGdex `low.webp`를 먼저 렌더링한다.
- 상세 페이지는 카드 검사 품질을 위해 `card_printings.image_url`의 고해상도 이미지를 우선하되, `next/image` width/height와 `sizes`로 필요한 폭에 맞춰 최적화한다.
- 새 외부 이미지 출처를 추가할 때는 `remotePatterns`와 fallback 우선순위를 함께 검토한다.

## 한국판 포켓몬 가격 source 검증

### 문제

한국판 포켓몬 카드는 안정적인 공개 가격 API가 부족하고, 국내 거래처는 판매중 가격과 실제 체결가가 분리되지 않는 경우가 많다. 카드명 검색만으로는 세트, 카드 번호, 언어판, finish, 상태, 그레이딩이 섞일 수 있으므로 자동 수집을 먼저 만들면 잘못된 가격이 `card_printings`에 연결될 위험이 크다.

### 1차 검증 기준

| 기준             | 설명                                                   | MVP 판단                         |
| ---------------- | ------------------------------------------------------ | -------------------------------- |
| 실거래성         | 실제 체결가 또는 sold listing을 확인할 수 있는가       | 가장 높은 우선순위               |
| 접근 가능성      | API, 파트너, export, 합법적 수동 수집 경로가 있는가    | 자동화 전 필수 확인              |
| ToS 적합성       | crawler, 저장, 재표시에 대한 약관 리스크가 낮은가      | 리스크 높으면 수동 import만 허용 |
| 카드 식별 정확도 | 세트, 카드 번호, 언어, finish, 상태를 구분할 수 있는가 | 낮으면 가격 산정 제외            |
| 표본 수          | 최근 30/90일 표본이 충분한가                           | 부족하면 UI에 낮은 신뢰도 표시   |
| 가격 형태        | 판매중 최저가인지 실거래가인지 구분 가능한가           | 판매중 가격은 보조 지표          |

### 후보 source 평가표

| source                          | 가격 성격                                                 | 접근/API 1차 확인                                                                                                                       | 주요 리스크                                                                   | 1차 처리                                                                             |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| KREAM                           | 자동 수집은 판매중 호가=asking, 기존 수동 CSV는 체결=sold | 공개 API 확인 안 됨. 상품/호가/체결 데이터 재사용은 제휴 확인 필요                                                                      | 싱글 카드 커버리지 제한, 재표시/저장 권한 불명확                              | 자동 스캐폴드(`kream_asking_median`, 플래그 차단) + 수동 import(`manual_kream` sold) |
| 번개장터                        | 판매중 호가=asking, 판매완료 수동 확인 시 sold            | 공개 API 확인 안 됨                                                                                                                     | 거래완료 여부와 최종 체결가 신뢰도, crawler ToS 리스크                        | 스캐폴드(`bunjang`, 플래그 차단) + 수동 import(`manual_bunjang` asking/sold)         |
| 중고나라                        | 판매중/거래완료 혼재                                      | 공개 상품 페이지와 판매완료 표시는 확인됨. 공개 API 확인 안 됨                                                                          | 텍스트 매칭 오류와 상태 정보 부족                                             | 수동 검증 우선                                                                       |
| 당근                            | 지역 개인거래                                             | 공개 API 확인 안 됨. 지역/앱 기반 접근성이 강함                                                                                         | 검색/접근 자동화 어려움, 지역 편차 큼                                         | 자동 adapter 후보에서 후순위                                                         |
| 국내 카드샵                     | 판매중/품절가                                             | 매장별 개별 확인 필요                                                                                                                   | 실거래가가 아닌 판매 희망가일 수 있음                                         | 보조 지표                                                                            |
| eBay sold                       | 해외 실거래                                               | Marketplace Insights API가 sold item sales history 경로지만 restricted/limited release이며 Buy API production approval과 계약 확인 필요 | 한국 국내 시세와 괴리, 배송비/환율 영향, restricted API 데이터 저장/표시 제약 | 1차 자동 adapter 대상(승인 전 scraping 금지)                                         |
| PriceCharting 개별 eBay sold 행 | 해외 실거래 index                                         | 공개 페이지의 historic sales 표에서 개별 eBay completed-sale 날짜·제목·가격 확인 가능. 직접 eBay 원문은 현재 환경에서 차단됨            | 제3자 index라 eBay item 원문보다 신뢰도가 낮고 item id 직접 확보가 제한됨     | 수동 CSV 보조 evidence(`pricecharting_ebay_sold`), 집계값은 사용 금지                |
| Cardmarket                      | 유럽 거래/판매 데이터                                     | 공식 API는 있으나 현재 신규 신청을 받지 않음                                                                                            | 국내 KRW 시세와 괴리, API credential 공유 금지                                | 교차 검증                                                                            |
| Guardian TCG                    | 제3자 집계                                                | 개발자 API와 무료 tier 확인됨                                                                                                           | 원천 데이터 재배포 조건과 한국판 매칭 품질 확인 필요                          | 교차 검증                                                                            |

### 한국판 포켓몬 10장 검증 샘플

가격 source 검증은 아래 10개 `card_printings` 후보부터 진행한다. 선정 기준은 국내외 검색 빈도가 높은 캐릭터, 최근 세트와 구형 세트 혼합, SAR/AR/SR 등 가격 차이가 큰 rarity 포함, 공식 한국 카드 상세 페이지로 세트/번호를 확인할 수 있는지다.

| sample | 카드       | 세트                                                  | 번호/레어도 | finish  | 공식 상세 ID   | 검증 이유                                 |
| ------ | ---------- | ----------------------------------------------------- | ----------- | ------- | -------------- | ----------------------------------------- |
| KR-001 | 리자몽 EX  | XY BREAK 확장팩 BASE PACK 20th Anniversary            | 103/100 SR  | unknown | `BS2016009103` | 구형 인기 카드와 vintage성 가격 차이 확인 |
| KR-002 | M리자몽 EX | XY BREAK 확장팩 BASE PACK 20th Anniversary            | 104/100 SR  | unknown | `BS2016009104` | 메가진화/구형 고가 후보 매칭 검증         |
| KR-003 | 리자몽 ex  | 스칼렛&바이올렛 확장팩 「흑염의 지배자」              | 134/108 SAR | unknown | `BS2023015134` | 현대 SAR 대표 chase 카드                  |
| KR-004 | 리자몽 ex  | 스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」       | 201/165 SAR | unknown | `BS2023014201` | 151 세트 대표 고수요 카드                 |
| KR-005 | 뮤 ex      | 스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」       | 205/165 SAR | unknown | `BS2023014205` | 151 세트 인기 포켓몬 SAR                  |
| KR-006 | 피카츄     | 스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」       | 173/165 AR  | unknown | `BS2023014173` | 고수요 캐릭터의 중저가 AR 표본            |
| KR-007 | 거북왕 ex  | 스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」       | 202/165 SAR | unknown | `BS2023014202` | 151 스타팅 포켓몬 SAR 비교군              |
| KR-008 | 가디안 ex  | 포켓몬 카드 게임 스칼렛&바이올렛 확장팩 「스칼렛 ex」 | 101/078 SAR | unknown | `BS2023006101` | 플레이 수요와 컬렉션 수요가 겹치는 카드   |
| KR-009 | 블래키 ex  | 스칼렛&바이올렛 하이클래스팩 「테라스탈 페스타 ex」   | 217/187 SAR | unknown | `BS2024019217` | 이브이 진화체 고수요 카드                 |
| KR-010 | 님피아 ex  | 스칼렛&바이올렛 하이클래스팩 「테라스탈 페스타 ex」   | 212/187 SAR | unknown | `BS2024019212` | KR-009와 같은 세트/다른 인기 캐릭터 비교  |

`finish`는 공식 상세 페이지에서 normal/holo/reverse_holo를 안정적으로 식별할 수 있을 때만 확정한다. 불명확하면 `unknown`으로 두고, 같은 세트/번호에 finish가 여러 개 존재하는 경우 가격 import 전 `card_printings`를 분리한다.

### 수동 import CSV 계약

CSV는 사람이 source를 확인한 뒤 `price_observations` 또는 asking snapshot에 넣을 수 있는 행만 작성한다. `price_kind=sold`는 실거래 관측치로, `price_kind=asking` 또는 `listing`은 판매중 호가 보조 trend로만 처리하며 둘을 섞지 않는다.

| 컬럼               | 필수        | 예                                                          | 매핑/규칙                                                             |
| ------------------ | ----------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `sample_id`        | yes         | `PKMKR-BS2023014201`                                        | 공식 한국 카드 번호 기반 식별자                                       |
| `card_name`        | yes         | `리자몽 ex`                                                 | 사람이 확인하는 표시명                                                |
| `set_name`         | yes         | `스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」`           | `card_printings.set_name` 매칭 보조                                   |
| `set_code`         | no          | `BS2023014201`                                              | 공식 상세 ID 또는 외부 source set code                                |
| `collector_number` | yes         | `201/165`                                                   | `card_printings.collector_number`                                     |
| `rarity`           | no          | `SAR`                                                       | `card_printings.rarity`                                               |
| `language`         | yes         | `ko`                                                        | 한국판은 `ko`                                                         |
| `region`           | yes         | `KR`                                                        | 한국 시장/지역판                                                      |
| `finish`           | yes         | `unknown`                                                   | `normal`, `holo`, `reverse_holo`, `unknown`                           |
| `source_name`      | yes         | `manual_kream`, `manual_bunjang`, `pricecharting_ebay_sold` | `price_observations.source_name` 또는 asking snapshot source          |
| `source_item_id`   | no          | `123456789`                                                 | source 고유 ID. 없으면 비움                                           |
| `source_url`       | yes         | `https://...`                                               | 중복 판별과 감사 추적용                                               |
| `listing_title`    | yes         | `포켓몬카드 151 리자몽 ex SAR`                              | 원천 제목                                                             |
| `market`           | yes         | `KR`                                                        | `KR`, `JP`, `NA`                                                      |
| `currency`         | yes         | `KRW`                                                       | 원천 통화                                                             |
| `price_kind`       | yes         | `sold`                                                      | `sold`는 실거래, `asking`/`listing`은 판매중 호가 보조 trend          |
| `sold_price`       | conditional | `120000`                                                    | `price_kind=sold`일 때 필수. 배송비 제외 원칙                         |
| `sold_at`          | conditional | `2026-05-21T12:00:00+09:00`                                 | 정확한 체결 시간이 없으면 확인한 날짜의 정오                          |
| `observed_at`      | yes         | `2026-05-21T14:00:00+09:00`                                 | 수동 확인 시각                                                        |
| `condition_label`  | no          | `near_mint`                                                 | `near_mint`, `light_played`, `played`, `damaged`, `sealed`, `unknown` |
| `variant`          | yes         | `raw`                                                       | `raw`, `graded`                                                       |
| `grade_company`    | conditional | `PSA`                                                       | `variant=graded`일 때 사용                                            |
| `grade_value`      | conditional | `10`                                                        | `variant=graded`일 때 사용                                            |
| `shipping_price`   | no          | `3000`                                                      | 집계 가격에는 기본 제외, raw payload에는 보존                         |
| `confidence_score` | yes         | `0.85`                                                      | 매칭 신뢰도. 0.8 미만은 집계 제외 후보                                |
| `raw_payload_json` | no          | `{"memo":"판매완료 화면 확인"}`                             | 원천 응답/수동 메모의 비민감 요약                                     |
| `exclude_reason`   | no          | `not_sold_price`                                            | 제외 행일 때 사유                                                     |

### 매칭/제외 규칙

- `card_name`, `collector_number`, `rarity`, `language`, `region`이 맞아야 기본 매칭으로 인정한다.
- `set_name` 또는 `set_code`가 다르면 같은 카드명이어도 제외한다.
- `listing_title`에 `일본판`, `영문판`, `오리카`, `프록시`, `대리`, `미개봉팩`, `박스`, `세트 일괄`이 포함되면 사람이 확인하기 전까지 제외한다.
- 상태가 명확하지 않은 raw 카드는 `condition_label=unknown`, `confidence_score <= 0.7`로 둔다.
- graded 카드는 raw와 절대 섞지 않고 `variant=graded`, `grade_company`, `grade_value`를 모두 채운다.
- 배송비, 수수료, 묶음 할인은 `raw_payload_json`에 보존하되 기본 `sold_price`에는 포함하지 않는다.
- `price_kind=asking` 또는 `listing` 행은 `price_observations`에 넣지 않고 asking snapshot 경로(`aggregateAskingObservations`)로만 처리한다.
- 자동 adapter가 바로 집계할 수 있는 행은 `price_kind=sold`, `variant=raw`, `exclude_reason` 없음, `confidence_score >= 0.8`, 단일 카드 listing, source가 제공한 sold timestamp 또는 sold date가 있는 행으로 제한한다.
- sold 여부는 확인되지만 정확한 sold timestamp가 없는 행은 수동 검증 표본으로 남길 수 있으나, 자동 snapshot 집계 전에는 `observed_at` 재검증 또는 source별 원천 timestamp 확보가 필요하다.

### 운영 규칙

- 자동 crawler 구현 전에는 한국판 포켓몬 인기/대표 카드 10장을 수동으로 검증한다.
- CSV `sample_id`는 공식 한국 카드 번호 기반 `PKMKR-<card_num>`을 사용한다. 기존 `KR-*` priority 번호는 실제 evidence 행의 `raw_payload_json.worklist_id`에만 alias로 남긴다.
- source URL/item ID, 거래일, 원천 가격/통화, 상태/variant, confidence 근거가 채워진 sample은 실제 evidence 행만 남기고, 아직 부족한 sample은 `source_name=pending`, `exclude_reason=pending_evidence` 검증 대기 후보로 유지한다.
- 검증 샘플은 `card_printings` 단위로 고정한다. 최소 식별자는 `game`, `card name`, `set`, `collector_number`, `language`, `region`, `finish`, `condition_label`, `variant`다.
- `price_observations`에 저장할 수 없는 source는 MVP 가격 산정에 쓰지 않는다.
- PriceCharting은 카드별 평균가/price guide가 아니라 historic sales 표의 개별 eBay completed-sale 행만 수동 CSV에 넣는다. `source_name=pricecharting_ebay_sold`, `source_item_id=pc-...`로 별도 구분하고, 직접 eBay 원문보다 낮은 confidence를 둔다.
- 같은 국내 source라도 sold/asking이 모두 들어올 수 있으므로 `source_name`만으로 가격 성격을 판단하지 않는다. 수동 sold CSV는 source별로 따로 `card_price_snapshots.source_name`을 보존하고 `aggregation_method=median_filtered`로 남기며, asking CSV는 `aggregation_method=manual_asking_median`으로 남긴다.
- source별 표본 수가 부족하면 `card_price_snapshots.sample_count`를 그대로 노출하고, UI에서 신뢰도를 숨기지 않는다.
- 판매중 호가 snapshot은 상세 대표 가격에 사용하고, 판매 완료 데이터는 대표 가격 계산에서 제외해 차트 참고 데이터로만 유지한다.
- source별 표본 수는 `price_kind=sold`, `variant=raw`, `exclude_reason` 없음 기준으로 세며, eBay 자동 adapter 후보 판단은 국내 수동 source 표본과 분리해서 본다.

### CSV 기준 matching/outlier 확정

2026-05-21 기준 `memory-bank/price-source-validation.csv` 48개 행을 검토해 원천 관측치 보관 기준과 snapshot 집계 기준을 분리한다.

#### 매칭 단계

| 단계             | 조건                                                                                                                                                          | 처리                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| hard reject      | `price_kind != sold`, source aggregate/estimate, seller-ended listing, bundle, graded를 raw로 사용, language conflict, 세트/번호 부족, proxy/orica/sealed box | `exclude_reason`을 채우고 snapshot 집계 제외                           |
| observation only | sold/raw는 맞지만 `confidence_score < 0.8`, 정확한 sold timestamp 부재, collector number가 텍스트에 없고 사진/제목만으로 보강한 행                            | CSV와 `price_observations` 후보로 보존하되 snapshot 집계 기본 제외     |
| snapshot input   | `price_kind=sold`, `variant=raw`, `exclude_reason` 없음, `confidence_score >= 0.8`, 단일 카드, 세트/번호/언어/지역 일치, source sold date 확보                | 조건 bucket과 표본 수 기준을 통과하면 `card_price_snapshots` 집계 후보 |

#### 상태 bucket

raw 가격은 상태별 가격 차이가 커서 하나의 평균으로 섞지 않는다.

| bucket       | 포함 condition                                     | snapshot 처리                                                                 |
| ------------ | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `clean_raw`  | `near_mint`, `light_played`, 신뢰 가능한 `unknown` | MVP 기본 raw 평균 후보. 단, 손상/하자 문구가 있으면 제외한다.                 |
| `played_raw` | `played`, `damaged`                                | 원천 관측치로 보존한다. 같은 bucket 표본이 3개 이상일 때만 별도 snapshot 후보 |
| `graded`     | `variant=graded`                                   | raw와 분리한다. 회사/등급별 표본이 충분할 때만 별도 snapshot 후보             |

#### 이상치 제거

- 배송비와 수수료는 `sold_price`에 포함하지 않고, `shipping_price` 또는 `raw_payload_json`에 보존한다.
- 통화가 다른 행은 원천 통화를 보존하고, snapshot 집계 직전에 `sold_at` 기준 FX로 KRW 기준 가격을 만든다.
- 중복 제거 키는 `source_name + source_item_id`를 우선하고, `source_item_id`가 없으면 canonicalized `source_url`을 사용한다.
- 집계 그룹은 `card_printing_id + market + variant + condition_bucket + sold_at window` 기준이다.
- 필터와 이상치 제거 후 `sample_count < 3`이면 공개 평균 snapshot을 만들지 않고 관측치만 보존한다.
- `sample_count`가 3~4개면 median 기준 0.5배 미만 또는 2.0배 초과 가격을 manual review로 보류한다.
- `sample_count`가 5개 이상이면 IQR 기준(`Q1 - 1.5 * IQR`, `Q3 + 1.5 * IQR`) 밖의 가격을 보류한다. 동시에 median 0.4배 미만 또는 2.5배 초과 가격은 hard guard로 보류한다.
- 가격 차이가 상태 차이에서 온 경우는 이상치로 보지 않고 다른 condition bucket으로 분리한다.

#### 이번 CSV 적용 결과

| 기준                                                        | 행 수 | 의미                                           |
| ----------------------------------------------------------- | ----- | ---------------------------------------------- |
| 전체 CSV 행                                                 | 48    | source 검증용 전체 원천 후보                   |
| raw sold, `exclude_reason` 없음                             | 38    | 수동 검증 표본 수 계산에 사용할 수 있는 행     |
| raw sold, `exclude_reason` 없음, `confidence_score >= 0.8`  | 33    | snapshot 후보 1차 필터 통과 행                 |
| `clean_raw` snapshot 후보                                   | 29    | damaged/played를 제외한 MVP 기본 raw 평균 후보 |
| `confidence_score < 0.8`로 observation only 처리한 raw sold | 5     | KR-004 2개, KR-001 1개, KR-009 1개, KR-002 1개 |

`clean_raw` 기준으로는 `KR-003`, `KR-004`, `KR-005`, `KR-006`, `KR-007`, `KR-008`만 현재 3개 이상이다. `KR-001`, `KR-002`, `KR-009`, `KR-010`은 raw sold 전체 표본은 3개 이상이지만, 상태/신뢰도 필터를 통과한 clean snapshot 표본이 3개 미만이므로 MVP 기본 평균 snapshot은 만들지 않는다.

### KR-004 1차 수동 수집 결과

2026-05-21에 `KR-004 리자몽 ex / 포켓몬 카드 151 / 201/165 SAR`부터 수동 표본 수집을 시작했고, 결과 행은 `memory-bank/price-source-validation.csv`에 기록했다.

| source       | 확인 결과                             | `price_kind=sold` 표본 | 판단                                                                                                                             |
| ------------ | ------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| KREAM        | 한글판 상품과 체결 거래 확인          | 3개                    | 표본은 충분하지만 모두 graded 거래라 raw 시세와 분리해야 한다. 공개 API/재사용 권한은 여전히 미확인이다.                         |
| 중고나라     | 판매완료 상품 확인                    | 3개                    | 판매완료 표시는 있으나 일부 행은 세트/번호 텍스트가 부족해 `exclude_reason` 또는 낮은 신뢰도로 둔다. 자동 adapter 후보는 아니다. |
| 번개장터     | Global Bunjang에서 sold out 상품 확인 | 3개                    | raw sold 표본은 충분하다. 다만 공개 API/재사용 조건 미확인으로 수동 import 우선이다.                                             |
| Guardian TCG | 한국판 카드 집계 페이지 확인          | 0개                    | 개별 sold가 아니라 `$160.24` raw estimate와 pricecharting 기반 집계만 제공하므로 import sold 표본에서 제외한다.                  |
| eBay sold    | sold listing 확인                     | 4개                    | raw sold 표본과 item ID가 확보된다. API/Marketplace Insights 접근이 가능하면 1차 자동 adapter 최우선 후보로 본다.                |

1차 adapter 후보는 `ebay_sold`를 우선한다. Guardian TCG는 개별 원천 sold가 아니라 집계 가격 source로만 검토하고, KREAM/번개장터/중고나라는 표본 수가 있어도 공개 API/파트너 권한이 확인되기 전까지 자동 crawler가 아닌 수동 import source로 둔다.

### eBay sold 1차 추가 수집 결과

2026-05-21에 남은 9장(`KR-001`~`KR-003`, `KR-005`~`KR-010`)의 eBay sold 공개 검색 결과를 1차로 추가 수집했다. 결과 행은 `memory-bank/price-source-validation.csv`에 반영했다.

| sample | 확인 결과                                      | 판단                                                                                               |
| ------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| KR-001 | raw sold 2개                                   | 구형 103/100은 상태 편차가 매우 크다. raw 3개 미만이므로 추가 표본 필요.                           |
| KR-002 | raw sold 1개, graded sold 1개, bundle 제외 1개 | raw/graded/bundle을 분리해야 한다. 단일 raw 표본이 부족하다.                                       |
| KR-003 | raw sold 3개                                   | eBay raw 표본 기준 최소 검증선을 충족한다.                                                         |
| KR-005 | raw sold 3개                                   | eBay raw 표본 기준 최소 검증선을 충족한다. GBP 거래 1개는 FX 처리 전 별도 통화로 보존한다.         |
| KR-006 | raw sold 3개, language conflict 제외 1개       | eBay raw 표본 기준 최소 검증선을 충족한다. title과 item specifics의 언어가 충돌하는 행은 제외한다. |
| KR-007 | raw sold 5개                                   | eBay raw 표본 기준 최소 검증선을 충족한다.                                                         |
| KR-008 | raw sold 2개                                   | raw 3개 미만이므로 추가 표본 필요.                                                                 |
| KR-009 | graded sold 1개, ended-not-sold 제외 1개       | raw sold 표본을 확보하지 못했다. graded 가격만으로 raw 시세를 만들 수 없다.                        |
| KR-010 | raw sold 3개                                   | eBay raw 표본 기준 최소 검증선을 충족한다.                                                         |

이번 패스에서 추가로 확인된 제외 규칙:

- 같은 listing이 여러 카드를 묶은 bundle이면 가격을 단일 `card_printings`에 귀속하지 않는다.
- listing title은 Korean이어도 item specifics의 `Language`가 Japanese 등으로 충돌하면 제외하고 사람이 사진/상세를 재확인한다.
- seller가 종료한 listing은 가격이 있어도 sold observation으로 쓰지 않는다.
- eBay 다중 통화 거래는 원천 통화를 유지하고, snapshot 집계 전 FX 기준일/환율 source를 별도로 결정한다.

### 부족 raw sold 표본 보강 결과

2026-05-21에 `KR-001`, `KR-002`, `KR-008`, `KR-009`의 부족 표본을 추가 확인했다. eBay에서 먼저 찾고, 부족한 샘플은 Global Bunjang과 중고나라 판매완료/매진 표본으로 보강했다. 결과 행은 `memory-bank/price-source-validation.csv`에 추가했다.

| sample | 추가 확인 결과                                                           | 판단                                                                                                                                              |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| KR-001 | eBay out-of-stock raw 1개 추가. 총 raw sold 3개, eBay raw sold 3개       | 최소 표본 수는 충족했지만 추가 행은 정확한 sold timestamp가 없어 신뢰도 0.76이다. 자동 집계 전 source timestamp 재확인이 필요하다.                |
| KR-002 | Global Bunjang sold-out raw 1개, 중고나라 판매완료 raw 1개 추가          | 총 raw sold 3개가 됐다. 단, eBay raw sold는 1개뿐이고 국내 수동 source 보강 행은 정확한 sold timestamp 또는 collector number 텍스트가 불완전하다. |
| KR-008 | Global Bunjang sold-out raw 1개 추가. 총 raw sold 3개, eBay raw sold 2개 | 전체 raw 표본 수는 충족했지만 eBay 단독 최소선은 미충족이다. 국내 수동 import source 보강 샘플로 유지한다.                                        |
| KR-009 | eBay raw sold 1개, 중고나라 판매완료 raw 2개 추가. 총 raw sold 3개       | 전체 raw 표본 수는 충족했지만 eBay 단독 raw sold는 1개뿐이다. 국내 수동 표본은 collector number가 텍스트에 없어 신뢰도 0.78~0.80으로 둔다.        |

보강 후 CSV 기준 raw sold 표본 수:

| sample | raw sold 전체 | eBay raw sold | 비고                                 |
| ------ | ------------- | ------------- | ------------------------------------ |
| KR-001 | 3             | 3             | 추가 eBay 행은 sold timestamp 불완전 |
| KR-002 | 3             | 1             | 국내 수동 source 보강                |
| KR-008 | 3             | 2             | 국내 수동 source 보강                |
| KR-009 | 3             | 1             | 국내 수동 source 보강                |

현재 기준 `ebay_sold`는 1차 자동 adapter 후보로 둘 수 있지만, 자동 집계 입력은 eBay에서 exact sold timestamp와 item ID를 구조화할 수 있는 행으로 제한한다. `KR-002`, `KR-008`, `KR-009`처럼 국내 수동 source를 포함해야 3개 이상이 되는 샘플은 adapter 품질 판단에서 eBay 단독 충족 샘플과 분리한다. 국내 source는 표본 보강에는 유효하지만 공개 API/파트너 권한이 확인되지 않아 자동 adapter 후보가 아니라 수동 import source로 유지한다.

### eBay sold API/약관 최종 확인

2026-05-22 기준 공식 eBay Developer 문서 확인 결과, 1차 자동 adapter source는 `ebay_sold`로 결정하되 production 구현은 eBay Buy API/Marketplace Insights production access 승인과 API License Agreement 준수 확인 이후로 제한한다.

확인한 공식 경로:

- Buying Application 안내: Buy APIs는 승인된 eBay partner 대상이며 production access를 위해 Application Growth Check와 formal agreement가 필요하다. Marketplace Insights API는 eBay sold item sales history를 제공하는 limited release API로 설명된다.
- Buy API marketplace support: Marketplace Insights API는 US/GB/AU/CA/DE/FR/ES/IT 등 일부 marketplace를 지원하지만, restricted이며 현재 신규 사용자에게 open되어 있지 않다고 명시되어 있다.
- Buy API filters: Marketplace Insights `search`는 `lastSoldDate`, `conditions`, `conditionIds`, `itemLocationCountry`, `priceCurrency` 같은 filter를 지원한다. Browse API의 `itemEndDate`는 판매중 listing 종료 예정일 필터이지 sold history가 아니다.
- Marketplace Insights resources 검색 인덱스: `/item_sales/search`는 keyword, GTIN, category, product 기준으로 sold item을 검색하고 90-day sales history를 반환하는 경로로 확인된다.
- API License Agreement: market trends, pricing strategies, sales volumes 등을 제공하는 API는 Restricted APIs로 분류된다. eBay content를 공개 표시할 때 최신성, 분리 표시, 삭제 의무가 있으며, eBay의 prior written permission 없이 일부 derived statistics 또는 Restricted API raw/aggregated bulk redistribution을 할 수 없다.

#### 판단

`ebay_sold`는 10장 수동 검증에서 가장 자동화 가능성이 높다. 이유는 개별 sold item ID, sold price, sold timestamp/date, condition 일부, item URL을 구조화할 수 있고, eBay 공식 경로가 sold sales history를 별도로 제공하기 때문이다.

다만 `ebay_sold`는 즉시 production crawler 구현 대상이 아니다. Marketplace Insights가 restricted/limited release이고 신규 사용자에게 open되어 있지 않으므로, 승인 전에는 eBay 페이지 scraping을 자동화하지 않는다. 승인 전 작업은 adapter contract, sandbox/mock 기반 파서, 수동 CSV import까지만 허용한다.

#### raw single-card sold 필터링 가능성

API filter만으로 한국판 단일 카드 raw 거래를 완전히 보장할 수는 없다. `conditions`/`conditionIds`, `lastSoldDate`, marketplace/location, keyword/category/product 계열 filter로 후보를 좁힌 뒤, adapter 내부에서 다음 규칙을 반드시 적용한다.

- title, category, item specifics/localized aspects, condition/condition descriptors, item URL을 함께 사용해 `card_printing`을 매칭한다.
- `collector_number`, set marker/name, language/Korean keyword가 맞지 않으면 observation only 또는 reject로 둔다.
- title이나 specifics에 PSA/BGS/CGC/graded/slab이 있으면 raw snapshot 후보에서 제외한다.
- lot, bundle, set, pack, box, multiple cards, evolution line 묶음은 single-card가 아니므로 제외한다.
- `totalSoldQuantity > 1`인 반복 판매 listing은 개별 단일 거래 시점/가격을 확인할 수 없는 경우 snapshot input에서 제외하거나 별도 review로 둔다.
- sold timestamp가 `lastSoldDate` 수준으로만 제공되는 경우에는 source timestamp로 저장할 수 있으나, 공개 snapshot 집계에는 `confidence_score >= 0.8`과 단일 카드 판정 통과가 필요하다.

#### 1차 source 결정

1차 자동 adapter source는 `ebay_sold`로 확정한다.

운영 게이트:

- eBay Developer 계정과 Buy API production access를 확보한다.
- Marketplace Insights access가 실제로 부여되는지 확인한다.
- API License Agreement 기준으로 원천 eBay content 저장, 공개 표시, 집계 snapshot 표시 범위를 확인한다.
- 승인 전 eBay web page scraping, sold page HTML 수집, 우회적 bulk 수집은 하지 않는다.
- 공개 UI는 eBay 원천 raw listing을 그대로 노출하지 않고, 허용 범위가 확인된 집계 snapshot과 source/sample metadata만 표시한다.

### 다음 확인 사항

- eBay Developer 계정, Buy API production access, Marketplace Insights access 가능 여부를 실제 계정 기준으로 확인한다.
- API License Agreement 검토 결과를 바탕으로 eBay 원천 데이터 저장/표시/집계 범위를 adapter contract에 반영한다.
- 자동 집계 전 FX 기준일/환율 source와 `confidence_score < 0.8` 행의 제외 방식을 구현 계약에 반영한다.

## Supabase seed migration CTE visibility

### 문제

2026-05-22 포켓몬 카탈로그 seed 작업에서 한 migration statement 안에 `card_sets` upsert, `cards` upsert, `card_printings` upsert, `card_category_links` insert를 모두 data-modifying CTE로 묶자, 뒤쪽 CTE가 앞쪽 insert 결과를 base table 조회로 보지 못했다. 첫 번째 시도는 중복 CTE row 때문에 `ON CONFLICT DO UPDATE command cannot affect row a second time`으로 rollback됐고, 이후 단일 statement는 game/set/category는 들어갔지만 cards 또는 printings/links가 0건으로 남았다.

### 처리

- seed를 3개 migration으로 분리했다.
  - `seed_pokemon_kr_catalog_sample`: `tcg_games`, `card_sets`, `card_categories`.
  - `seed_pokemon_kr_catalog_cards`: 기존 `card_sets` row 기준 `cards`.
  - `seed_pokemon_kr_catalog_printings_links`: 기존 `cards` row 기준 `card_printings`, `card_category_links`.
- 각 migration 뒤 Supabase MCP `execute_sql`로 row count를 검증했다.
- 최종 검증 결과: `pokemon` game 1개, set 5개, card 10개, printing 10개, category 9개, category link 30개, price snapshot 0개.

### 재발 방지

부모 row를 같은 statement에서 만들고 자식 row가 부모 table을 다시 조회해야 하는 seed migration은 statement를 나누거나, 앞쪽 CTE의 `returning` 결과만 join한다. `union all`로 upsert 결과와 기존 row를 합칠 때는 conflict target 중복 row가 생기지 않도록 `distinct`/단일 source를 보장한다.

## TCGdex Korean image coverage gap

### 문제

2026-05-22 포켓몬 이미지 enrichment에서 TCGdex REST API를 확인하니 `/ko/sets`에는 `SV2a`, `SV3`, `SV1S` 같은 한국어 set shell이 일부 있지만, seed에 필요한 secret rare card row/image는 직접 조회되지 않았다. 예를 들어 `/ko/sets/SV2a/201`, `/ko/cards/SV2a-201`, `/ko/sets/SV3/134`, `/ko/sets/SV1S/101`은 404 또는 빈 결과였다.

### 처리

- TCGdex 일본어 endpoint에서 같은 원판 set/localId가 존재하고 이미지 asset이 있는 8장만 보강했다.
  - `KR-003` → `SV3-134`
  - `KR-004` → `SV2a-201`
  - `KR-005` → `SV2a-205`
  - `KR-006` → `SV2a-173`
  - `KR-007` → `SV2a-202`
  - `KR-008` → `SV1S-101`
  - `KR-009` → `SV8a-217`
  - `KR-010` → `SV8a-212`
- 각 asset의 `high.webp`/`low.webp` 응답을 확인한 뒤 Supabase MCP migration `enrich_pokemon_seed_images_tcgdex`로 반영했다.
- `KR-001`, `KR-002`는 TCGdex `CP6` set shell에 card rows/images가 없고, collector number가 맞지 않는 영어판 Evolutions 이미지는 임의 대체로 판단해 사용하지 않았다.

### 재발 방지

TCGdex image enrichment는 한국어 원본 이미지가 아니라 equivalent 이미지일 수 있으므로 `card_printings.external_ids`에 `tcgdex_locale`과 `tcgdex_match_basis`를 같이 저장한다. 한국판 원본 이미지 출처가 확인되기 전에는 미매칭 카드를 다른 언어/세트 이미지로 느슨하게 대체하지 않는다.

## Home and cards page catalog query failure

### 문제

2026-05-23 배포 확인 중 `https://tcground.vercel.app`와 `/cards`가 500을 반환했다. 배포 자체는 Vercel에서 `Ready`였고, 로컬 `pnpm build`도 통과했다. 이후 로컬 production 서버에서 `/`와 `/cards`를 호출하자 Supabase catalog query가 `Invalid API key`로 실패하는 로그가 재현됐다.

해당 두 페이지는 `getFeaturedPokemonCards()`를 서버 컴포넌트 렌더 중 직접 호출했고, Supabase 조회 실패를 그대로 throw해 페이지 전체가 500이 됐다.

### 처리

- `app/page.tsx`는 인기 카드 조회 실패 시 `Failed to load home featured cards` 로그를 남기고 빈 목록으로 fallback한다.
- `app/cards/page.tsx`는 인기 카드 조회 실패 시 `Failed to load cards page featured cards` 로그를 남기고 기존 빈 상태 UI로 fallback한다.
- `storybook-static/**`가 ESLint 대상에 포함돼 품질 게이트를 깨던 문제는 생성 산출물 ignore로 정리했다.

### 재발 방지

공개 랜딩/목록 페이지의 보조 데이터는 인증/env/외부 조회 실패 시 페이지 전체를 500으로 만들지 않는다. 핵심 상세 조회처럼 데이터가 없으면 `notFound()`가 맞는 경로와, 보조 섹션처럼 빈 상태 fallback이 맞는 경로를 분리한다. Vercel env를 추가하거나 수정한 뒤에는 반드시 production redeploy를 수행하고, Supabase publishable key가 현재 프로젝트와 일치하는지 확인한다.

## Next dev server already running

### 문제

2026-06-15 `npm run dev` 실행 실패 보고를 점검했다. sandbox 안에서 처음 재현한 `next dev`는 `0.0.0.0:3000` listen 단계에서 `EPERM`으로 실패했지만, 실제 로컬 권한으로 다시 실행하자 Next가 같은 프로젝트의 기존 dev 서버를 감지하고 종료했다.

기존 서버 상태:

- PID: `32264`
- URL: `http://localhost:3000`
- 응답: HTTP 200
- 로그: `.next/dev/logs/next-development.log`

### 처리

- README/AGENTS 기준 프로젝트 표준 개발 명령이 `pnpm dev`임을 확인했다.
- `curl -I http://localhost:3000`으로 현재 앱이 이미 실행 중임을 확인했다.
- 새 `pnpm dev`/`npm run dev` 세션은 “Another next dev server is already running” 메시지와 함께 종료되는 것을 확인했다.

### 재발 방지

브라우저에서 `http://localhost:3000`이 열리면 새 dev 서버를 다시 띄우지 않는다. 새로 시작해야 하면 `kill 32264`처럼 기존 Next dev 서버를 종료한 뒤 `pnpm dev`를 실행한다. 이 repo는 pnpm workspace이므로 평소에는 `npm run dev`보다 `pnpm dev`를 우선 사용한다.

## LaunchAgent price collection cannot find node

### 문제

2026-06-15 `launchctl kickstart`로 일일 가격 수집 LaunchAgent를 실행했지만 `card_price_snapshots`에 6월 5일 이후 새 row가 생기지 않았다. LaunchAgent 상태는 `runs = 1`, `last exit code = 127`이었고 stderr에는 다음만 남았다.

```text
env: node: No such file or directory
```

원인은 `ProgramArguments`가 pnpm 절대 경로를 사용해도 pnpm 파일 자체가 `#!/usr/bin/env node` shebang을 사용한다는 점이다. launchd 기본 PATH는 `/usr/bin:/bin:/usr/sbin:/sbin`이라 nvm Node 경로(`/Users/songjihyeon/.nvm/versions/node/v22.17.0/bin`)를 찾지 못했다.

추가로 현재 `.env.local`은 `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `EBAY_ENV=sandbox` 상태다. 이 설정은 운영 Supabase가 아니라 로컬 DB를 대상으로 하며, 현재 service key로 price table을 조회하면 permission denied가 발생한다. 따라서 LaunchAgent PATH를 고쳐도 운영 DB에 자동 적재하려면 Supabase URL/service role key와 eBay production keyset을 별도로 맞춰야 한다.

### 처리

- `scripts/launchd/com.tcground.daily-price-collection.plist`에 `EnvironmentVariables.PATH`를 추가해 Node 22 bin 경로를 launchd 환경에 명시했다.
- 설치본 `/Users/songjihyeon/Library/LaunchAgents/com.tcground.daily-price-collection.plist`를 같은 내용으로 갱신하고 `launchctl bootstrap`으로 재등록했다.
- `env -i PATH=... /bin/zsh -lc 'pnpm --version && node --version'`로 launchd와 같은 PATH에서 pnpm/node 해석을 확인했다.

### 재발 방지

launchd에서 nvm/corepack/pnpm을 실행할 때는 pnpm 절대 경로만으로 충분하지 않다. plist의 `EnvironmentVariables.PATH`에 Node bin 경로를 넣거나, command string에서 PATH를 export한다. 수집이 실행됐는지는 `launchctl print ...`의 `last exit code`, `/tmp/tcground-daily-price-collection.err.log`, `price_collection_runs`를 함께 확인한다.

## 카드 상세 eBay fallback이 다른 카드·사이트로 이동

### 문제

카드 상세의 eBay fallback이 선택한 카드가 아닌 다른 카드나 국내 marketplace로 이동할 수 있다.

### 원인

`card_price_snapshots.source_url`은 출처 공통 필드이고, 과거 eBay Browse 행은 listing-level 카드 번호 필터 전에 저장된 item URL일 수 있다. UI는 원시 URL만으로 출처나 카드 일치 여부를 신뢰할 수 없다.

### 재발 방지

UI는 원시 URL의 출처를 추측하지 않는다. 필터링된 eBay listings를 우선하고, 국내 source URL은 실제 출처명으로 표시하며, 신뢰 가능한 직접 URL이 없으면 eBay 검색 결과를 사용한다.

## 카드 상세 캐시의 view model 필드 누락

### 문제

2026-07-07 `marketplaceFallbackLink` 추가 전 생성된 상세 캐시가 남은 카드에서 `MarketplaceLinks`가 `fallback.sourceLabel`을 읽으며 런타임 오류가 발생했다. 새 DB 조회 결과에는 필드가 있었지만 `unstable_cache`의 기존 직렬화 결과에는 없었다.

### 재발 방지

상세 view model의 필수 필드를 추가할 때는 `cardDetailBySlugCached` 키를 버전 갱신한다. UI 경계에서는 이전 캐시에 새 외부 링크 필드가 없더라도 카드 식별자로 안전한 eBay 검색 fallback을 파생해 페이지 전체가 중단되지 않게 한다.
