# TROUBLE SHOOTING

> PRD에 없던 엣지 케이스, 예외 상황, source 리스크 기록.
> 마지막 갱신: 2026-05-27 (UI package workspace dependency)

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

| source       | 가격 성격             | 접근/API 1차 확인                                                                                                                       | 주요 리스크                                                                   | 1차 처리                                     |
| ------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| KREAM        | 체결가 중심 가능      | 공개 API 확인 안 됨. 상품/체결 데이터 재사용은 제휴 확인 필요                                                                           | 싱글 카드 커버리지 제한, 재표시/저장 권한 불명확                              | 수동 검증만 허용                             |
| 번개장터     | 판매중/거래완료 혼재  | 공개 API 확인 안 됨                                                                                                                     | 거래완료 여부와 최종 체결가 신뢰도, crawler ToS 리스크                        | 수동 검증 우선                               |
| 중고나라     | 판매중/거래완료 혼재  | 공개 상품 페이지와 판매완료 표시는 확인됨. 공개 API 확인 안 됨                                                                          | 텍스트 매칭 오류와 상태 정보 부족                                             | 수동 검증 우선                               |
| 당근         | 지역 개인거래         | 공개 API 확인 안 됨. 지역/앱 기반 접근성이 강함                                                                                         | 검색/접근 자동화 어려움, 지역 편차 큼                                         | 자동 adapter 후보에서 후순위                 |
| 국내 카드샵  | 판매중/품절가         | 매장별 개별 확인 필요                                                                                                                   | 실거래가가 아닌 판매 희망가일 수 있음                                         | 보조 지표                                    |
| eBay sold    | 해외 실거래           | Marketplace Insights API가 sold item sales history 경로지만 restricted/limited release이며 Buy API production approval과 계약 확인 필요 | 한국 국내 시세와 괴리, 배송비/환율 영향, restricted API 데이터 저장/표시 제약 | 1차 자동 adapter 대상(승인 전 scraping 금지) |
| Cardmarket   | 유럽 거래/판매 데이터 | 공식 API는 있으나 현재 신규 신청을 받지 않음                                                                                            | 국내 KRW 시세와 괴리, API credential 공유 금지                                | 교차 검증                                    |
| Guardian TCG | 제3자 집계            | 개발자 API와 무료 tier 확인됨                                                                                                           | 원천 데이터 재배포 조건과 한국판 매칭 품질 확인 필요                          | 교차 검증                                    |

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

CSV는 사람이 source를 확인한 뒤 `price_observations`에 넣을 수 있는 행만 작성한다. 판매중 가격은 `price_kind=listing`으로 남겨 검토할 수는 있지만, MVP 집계에는 포함하지 않는다.

| 컬럼               | 필수        | 예                                                | 매핑/규칙                                                             |
| ------------------ | ----------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| `sample_id`        | yes         | `KR-004`                                          | 검증 샘플 식별자                                                      |
| `card_name`        | yes         | `리자몽 ex`                                       | 사람이 확인하는 표시명                                                |
| `set_name`         | yes         | `스칼렛&바이올렛 강화 확장팩 「포켓몬 카드 151」` | `card_printings.set_name` 매칭 보조                                   |
| `set_code`         | no          | `BS2023014201`                                    | 공식 상세 ID 또는 외부 source set code                                |
| `collector_number` | yes         | `201/165`                                         | `card_printings.collector_number`                                     |
| `rarity`           | no          | `SAR`                                             | `card_printings.rarity`                                               |
| `language`         | yes         | `ko`                                              | 한국판은 `ko`                                                         |
| `region`           | yes         | `KR`                                              | 한국 시장/지역판                                                      |
| `finish`           | yes         | `unknown`                                         | `normal`, `holo`, `reverse_holo`, `unknown`                           |
| `source_name`      | yes         | `manual_kream`, `manual_joongna`, `guardian_tcg`  | `price_observations.source_name`                                      |
| `source_item_id`   | no          | `123456789`                                       | source 고유 ID. 없으면 비움                                           |
| `source_url`       | yes         | `https://...`                                     | 중복 판별과 감사 추적용                                               |
| `listing_title`    | yes         | `포켓몬카드 151 리자몽 ex SAR`                    | 원천 제목                                                             |
| `market`           | yes         | `KR`                                              | `KR`, `JP`, `NA`                                                      |
| `currency`         | yes         | `KRW`                                             | 원천 통화                                                             |
| `price_kind`       | yes         | `sold`                                            | `sold`만 snapshot 집계 대상. `listing`은 보조 검토                    |
| `sold_price`       | conditional | `120000`                                          | `price_kind=sold`일 때 필수. 배송비 제외 원칙                         |
| `sold_at`          | conditional | `2026-05-21T12:00:00+09:00`                       | 정확한 체결 시간이 없으면 확인한 날짜의 정오                          |
| `observed_at`      | yes         | `2026-05-21T14:00:00+09:00`                       | 수동 확인 시각                                                        |
| `condition_label`  | no          | `near_mint`                                       | `near_mint`, `light_played`, `played`, `damaged`, `sealed`, `unknown` |
| `variant`          | yes         | `raw`                                             | `raw`, `graded`                                                       |
| `grade_company`    | conditional | `PSA`                                             | `variant=graded`일 때 사용                                            |
| `grade_value`      | conditional | `10`                                              | `variant=graded`일 때 사용                                            |
| `shipping_price`   | no          | `3000`                                            | 집계 가격에는 기본 제외, raw payload에는 보존                         |
| `confidence_score` | yes         | `0.85`                                            | 매칭 신뢰도. 0.8 미만은 집계 제외 후보                                |
| `raw_payload_json` | no          | `{"memo":"판매완료 화면 확인"}`                   | 원천 응답/수동 메모의 비민감 요약                                     |
| `exclude_reason`   | no          | `not_sold_price`                                  | 제외 행일 때 사유                                                     |

### 매칭/제외 규칙

- `card_name`, `collector_number`, `rarity`, `language`, `region`이 맞아야 기본 매칭으로 인정한다.
- `set_name` 또는 `set_code`가 다르면 같은 카드명이어도 제외한다.
- `listing_title`에 `일본판`, `영문판`, `오리카`, `프록시`, `대리`, `미개봉팩`, `박스`, `세트 일괄`이 포함되면 사람이 확인하기 전까지 제외한다.
- 상태가 명확하지 않은 raw 카드는 `condition_label=unknown`, `confidence_score <= 0.7`로 둔다.
- graded 카드는 raw와 절대 섞지 않고 `variant=graded`, `grade_company`, `grade_value`를 모두 채운다.
- 배송비, 수수료, 묶음 할인은 `raw_payload_json`에 보존하되 기본 `sold_price`에는 포함하지 않는다.
- `price_kind=listing` 행은 `price_observations` 집계에 넣지 않는다. 별도 listing 모델이 생기기 전까지 수동 검토 자료로만 둔다.
- 자동 adapter가 바로 집계할 수 있는 행은 `price_kind=sold`, `variant=raw`, `exclude_reason` 없음, `confidence_score >= 0.8`, 단일 카드 listing, source가 제공한 sold timestamp 또는 sold date가 있는 행으로 제한한다.
- sold 여부는 확인되지만 정확한 sold timestamp가 없는 행은 수동 검증 표본으로 남길 수 있으나, 자동 snapshot 집계 전에는 `observed_at` 재검증 또는 source별 원천 timestamp 확보가 필요하다.

### 운영 규칙

- 자동 crawler 구현 전에는 한국판 포켓몬 인기/대표 카드 10장을 수동으로 검증한다.
- 검증 샘플은 `card_printings` 단위로 고정한다. 최소 식별자는 `game`, `card name`, `set`, `collector_number`, `language`, `region`, `finish`, `condition_label`, `variant`다.
- `price_observations`에 저장할 수 없는 source는 MVP 가격 산정에 쓰지 않는다.
- source별 표본 수가 부족하면 `card_price_snapshots.sample_count`를 그대로 노출하고, UI에서 신뢰도를 숨기지 않는다.
- 판매중 최저가는 평균 거래가를 대체하지 않는다. 실거래가가 부족한 경우에만 보조 지표로 기록한다.
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
