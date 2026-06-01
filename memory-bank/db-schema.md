# DB SCHEMA

> TCGround MVP Supabase Postgres 데이터 모델 설계.
> 마지막 갱신: 2026-05-20

## 1. 목적과 범위

이 문서는 MVP P0/P1에 필요한 카드 탐색, 검색, 상품 상세 가격 차트, Supabase Auth 기반 관심 카드 저장, 포켓몬 우선 가격 관측치 수집을 지원하는 DB 설계의 단일 출처다.

실제 Supabase 적용은 Supabase MCP migration으로 진행한다. 현재 MVP 스키마는 `create_tcg_mvp_schema`, `optimize_favorite_cards_rls_policies`, `extend_price_collection_models`, `lock_internal_price_collection_tables` migration으로 적용되어 있다.

## 2. Supabase Postgres 스키마 초안

### `tcg_games`

TCG 대분류(포켓몬, 유희왕, 매직 등)의 기준 테이블이다.

| 컬럼            | 타입          | 제약                            | 설명                           |
| --------------- | ------------- | ------------------------------- | ------------------------------ |
| `id`            | `uuid`        | PK, default `gen_random_uuid()` | 내부 식별자                    |
| `slug`          | `text`        | unique, not null                | URL/필터 식별자. 예: `pokemon` |
| `name`          | `text`        | not null                        | 표시 이름. 예: `Pokemon`       |
| `name_ko`       | `text`        | nullable                        | 한국어 표시 이름. 예: `포켓몬` |
| `description`   | `text`        | nullable                        | 카테고리 소개                  |
| `display_order` | `integer`     | not null, default `0`           | 홈/카테고리 정렬               |
| `created_at`    | `timestamptz` | not null, default `now()`       | 생성 시각                      |
| `updated_at`    | `timestamptz` | not null, default `now()`       | 수정 시각                      |

인덱스: `unique(tcg_games.slug)`, `index(tcg_games.display_order)`.

### `card_sets`

세트/확장팩 단위 탐색과 상세 페이지의 세트명을 담당한다.

| 컬럼          | 타입          | 제약                            | 설명                            |
| ------------- | ------------- | ------------------------------- | ------------------------------- |
| `id`          | `uuid`        | PK, default `gen_random_uuid()` | 내부 식별자                     |
| `game_id`     | `uuid`        | FK `tcg_games(id)`, not null    | 소속 TCG                        |
| `slug`        | `text`        | not null                        | URL/필터 식별자. 예: `base-set` |
| `name`        | `text`        | not null                        | 세트명. 예: `Base Set`          |
| `name_ko`     | `text`        | nullable                        | 한국어 세트명                   |
| `released_on` | `date`        | nullable                        | 출시일                          |
| `card_count`  | `integer`     | nullable                        | 세트 내 카드 수                 |
| `created_at`  | `timestamptz` | not null, default `now()`       | 생성 시각                       |
| `updated_at`  | `timestamptz` | not null, default `now()`       | 수정 시각                       |

인덱스: `unique(card_sets.game_id, card_sets.slug)`, `index(card_sets.game_id)`.

### `cards`

홈 인기 카드, 검색 결과, 카테고리 목록, 상품 상세의 공통 원천이다. 가격 수집 모델 확장 후에는 “대표 카드” 역할을 담당하고, 언어판/지역판/세트/번호/호일 단위는 `card_printings`에서 분리해 관리한다.

| 컬럼               | 타입          | 제약                            | 설명                                                  |
| ------------------ | ------------- | ------------------------------- | ----------------------------------------------------- |
| `id`               | `uuid`        | PK, default `gen_random_uuid()` | 내부 식별자                                           |
| `game_id`          | `uuid`        | FK `tcg_games(id)`, not null    | 소속 TCG                                              |
| `set_id`           | `uuid`        | FK `card_sets(id)`, nullable    | 소속 세트                                             |
| `slug`             | `text`        | unique, not null                | 상세 URL 식별자. 예: `charizard-base-set-1st-edition` |
| `name`             | `text`        | not null                        | 카드명                                                |
| `normalized_name`  | `text`        | not null                        | 검색 정규화 이름                                      |
| `collector_number` | `text`        | nullable                        | 카드 번호                                             |
| `rarity`           | `text`        | nullable                        | 레어도                                                |
| `condition_label`  | `text`        | nullable                        | 대표 컨디션/그레이딩 라벨                             |
| `image_url`        | `text`        | nullable                        | 상세 이미지                                           |
| `thumbnail_url`    | `text`        | nullable                        | 목록 썸네일                                           |
| `is_featured`      | `boolean`     | not null, default `false`       | 홈 인기 카드 노출 여부                                |
| `created_at`       | `timestamptz` | not null, default `now()`       | 생성 시각                                             |
| `updated_at`       | `timestamptz` | not null, default `now()`       | 수정 시각                                             |

인덱스: `unique(cards.slug)`, `index(cards.game_id)`, `index(cards.set_id)`, `index(cards.normalized_name)`, `index(cards.is_featured)`.

### `card_printings`

실제 가격을 붙일 상품 단위다. 같은 Charizard라도 영어판/일본판/한국판, 세트 코드, collector number, 호일 상태가 다르면 별도 행으로 둔다.

| 컬럼               | 타입          | 제약                            | 설명                                    |
| ------------------ | ------------- | ------------------------------- | --------------------------------------- |
| `id`               | `uuid`        | PK, default `gen_random_uuid()` | 내부 식별자                             |
| `card_id`          | `uuid`        | FK `cards(id)`, not null        | 대표 카드                               |
| `language`         | `text`        | not null                        | 카드 언어. 예: `en`, `ja`, `ko`         |
| `region`           | `text`        | not null                        | 시장/지역판. 예: `NA`, `JP`, `KR`       |
| `set_name`         | `text`        | not null                        | 원천 기준 세트명                        |
| `set_code`         | `text`        | not null                        | 원천 기준 세트 코드                     |
| `collector_number` | `text`        | not null                        | 카드 번호                               |
| `rarity`           | `text`        | nullable                        | 레어도                                  |
| `finish`           | `text`        | not null, default `unknown`     | `normal`, `holo`, `reverse_holo` 등     |
| `image_url`        | `text`        | nullable                        | printing 이미지                         |
| `external_ids`     | `jsonb`       | not null, default `{}`          | TCGdex, Pokémon TCG API 등 외부 ID 매핑 |
| `created_at`       | `timestamptz` | not null, default `now()`       | 생성 시각                               |
| `updated_at`       | `timestamptz` | not null, default `now()`       | 수정 시각                               |

제약/인덱스: `unique(card_id, language, region, set_code, collector_number, finish)`, `index(card_printings.card_id)`, `index(card_printings.language, region)`, `index(card_printings.set_code, collector_number)`, `gin(card_printings.external_ids)`.

### `card_categories`

카테고리 페이지와 필터에 쓰는 탐색용 분류 마스터다. TCG 대분류, 레어도, 카드 타입, 시대 같은 범주를 같은 구조로 다룬다.

| 컬럼            | 타입          | 제약                                    | 설명                                           |
| --------------- | ------------- | --------------------------------------- | ---------------------------------------------- |
| `id`            | `uuid`        | PK, default `gen_random_uuid()`         | 내부 식별자                                    |
| `game_id`       | `uuid`        | FK `tcg_games(id)`, nullable            | 특정 TCG 전용 분류일 때 사용                   |
| `parent_id`     | `uuid`        | self FK `card_categories(id)`, nullable | 상위 카테고리                                  |
| `type`          | `text`        | not null                                | `game`, `set`, `rarity`, `card_type`, `era` 등 |
| `slug`          | `text`        | not null                                | URL/필터 식별자                                |
| `name`          | `text`        | not null                                | 표시 이름                                      |
| `display_order` | `integer`     | not null, default `0`                   | 표시 순서                                      |
| `created_at`    | `timestamptz` | not null, default `now()`               | 생성 시각                                      |
| `updated_at`    | `timestamptz` | not null, default `now()`               | 수정 시각                                      |

인덱스: `unique(card_categories.type, card_categories.slug)`, `index(card_categories.parent_id)`, `index(card_categories.game_id)`, `index(card_categories.display_order)`.

### `card_category_links`

카드와 탐색 카테고리의 다대다 연결 테이블이다.

| 컬럼          | 타입          | 제약                               | 설명      |
| ------------- | ------------- | ---------------------------------- | --------- |
| `card_id`     | `uuid`        | FK `cards(id)`, not null           | 카드      |
| `category_id` | `uuid`        | FK `card_categories(id)`, not null | 카테고리  |
| `created_at`  | `timestamptz` | not null, default `now()`          | 생성 시각 |

제약/인덱스: `primary key(card_id, category_id)`, `index(card_category_links.category_id)`.

### `card_price_snapshots`

상품 상세 가격 차트와 검색/목록 가격 요약의 기준 데이터다. 원천 거래는 `price_observations`에 저장하고, 검증/이상치 제거 후 일별 snapshot으로 집계한다. MVP에서는 최신 스냅샷을 현재 가격 요약으로 사용한다.

| 컬럼                 | 타입            | 제약                                | 설명                             |
| -------------------- | --------------- | ----------------------------------- | -------------------------------- |
| `id`                 | `uuid`          | PK, default `gen_random_uuid()`     | 내부 식별자                      |
| `card_printing_id`   | `uuid`          | FK `card_printings(id)`, not null   | 가격 대상 printing               |
| `snapshot_date`      | `date`          | not null                            | 가격 기준일                      |
| `currency`           | `text`          | not null, default `'KRW'`           | 통화                             |
| `market`             | `text`          | not null, default `'KR'`            | 가격 시장: `KR`, `JP`, `NA`      |
| `variant`            | `text`          | not null, default `'raw'`           | 가격 bucket. 예: `raw`, `graded` |
| `condition_label`    | `text`          | nullable                            | 상태 라벨. 예: `near_mint`       |
| `grade_company`      | `text`          | nullable                            | 그레이딩 회사. 예: `PSA`, `BGS`  |
| `grade_value`        | `text`          | nullable                            | 그레이딩 등급. 예: `10`, `9.5`   |
| `avg_price`          | `numeric(14,2)` | nullable                            | 평균 거래가                      |
| `min_price`          | `numeric(14,2)` | nullable                            | 최저가                           |
| `max_price`          | `numeric(14,2)` | nullable                            | 최고가                           |
| `sample_count`       | `integer`       | not null, default `0`               | 가격 산정 표본 수                |
| `source_name`        | `text`          | not null, default `aggregate`       | 가격 데이터 출처명               |
| `source_url`         | `text`          | nullable                            | 출처 URL                         |
| `aggregation_method` | `text`          | not null, default `median_filtered` | 집계 방식                        |
| `created_at`         | `timestamptz`   | not null, default `now()`           | 생성 시각                        |

제약/인덱스: `unique nulls not distinct(card_printing_id, snapshot_date, market, currency, variant, condition_label, grade_company, grade_value, source_name)`, `index(card_price_snapshots.card_printing_id, snapshot_date desc)`, `index(card_price_snapshots.market, snapshot_date desc)`.

### `price_observations`

실거래 원천 보존용 테이블이다. API, 수동 import, 허용된 crawler/partner source adapter가 관측한 개별 거래를 저장한다.

| 컬럼               | 타입            | 제약                              | 설명                               |
| ------------------ | --------------- | --------------------------------- | ---------------------------------- |
| `id`               | `uuid`          | PK, default `gen_random_uuid()`   | 내부 식별자                        |
| `card_printing_id` | `uuid`          | FK `card_printings(id)`, not null | 가격 대상 printing                 |
| `source_name`      | `text`          | not null                          | 원천 이름. 예: `tcgplayer`, `ebay` |
| `market`           | `text`          | not null                          | 가격 시장: `KR`, `JP`, `NA`        |
| `currency`         | `text`          | not null                          | 통화                               |
| `sold_price`       | `numeric(14,2)` | not null                          | 실거래가                           |
| `sold_at`          | `timestamptz`   | not null                          | 거래 시각                          |
| `observed_at`      | `timestamptz`   | not null, default `now()`         | 수집 시각                          |
| `condition_label`  | `text`          | nullable                          | 상태 라벨                          |
| `grade_company`    | `text`          | nullable                          | 그레이딩 회사                      |
| `grade_value`      | `text`          | nullable                          | 그레이딩 등급                      |
| `variant`          | `text`          | not null, default `raw`           | 가격 bucket                        |
| `listing_title`    | `text`          | nullable                          | 원천 listing 제목                  |
| `source_url`       | `text`          | nullable                          | 원천 URL                           |
| `source_item_id`   | `text`          | nullable                          | 원천 item/listing ID               |
| `confidence_score` | `numeric(4,3)`  | not null, default `0.5`           | 매칭 신뢰도. `0` 이상 `1` 이하     |
| `raw_payload`      | `jsonb`         | not null, default `{}`            | 원천 응답 일부                     |
| `created_at`       | `timestamptz`   | not null, default `now()`         | 생성 시각                          |

제약/인덱스: `index(price_observations.card_printing_id, sold_at desc)`, `index(price_observations.source_name, market, sold_at desc)`, `index(price_observations.variant, condition_label, grade_company, grade_value)`, `unique(source_name, source_item_id/source_url)` where source identifier exists.

### `price_collection_runs`

source별 수집 실행 로그다. 한 source 실패가 전체 가격 업데이트를 막지 않도록 source 단위 상태를 남긴다.

| 컬럼                    | 타입          | 제약                            | 설명                                        |
| ----------------------- | ------------- | ------------------------------- | ------------------------------------------- |
| `id`                    | `uuid`        | PK, default `gen_random_uuid()` | 내부 식별자                                 |
| `source_name`           | `text`        | not null                        | 원천 이름                                   |
| `market`                | `text`        | not null                        | 가격 시장: `KR`, `JP`, `NA`                 |
| `status`                | `text`        | not null                        | `running`, `succeeded`, `failed`, `partial` |
| `started_at`            | `timestamptz` | not null, default `now()`       | 시작 시각                                   |
| `finished_at`           | `timestamptz` | nullable                        | 종료 시각                                   |
| `observations_inserted` | `integer`     | not null, default `0`           | 저장한 관측치 수                            |
| `snapshots_created`     | `integer`     | not null, default `0`           | 생성한 스냅샷 수                            |
| `error_message`         | `text`        | nullable                        | 실패/부분 실패 사유                         |
| `metadata`              | `jsonb`       | not null, default `{}`          | adapter별 부가 정보                         |
| `created_at`            | `timestamptz` | not null, default `now()`       | 생성 시각                                   |

제약/인덱스: `index(price_collection_runs.source_name, market, started_at desc)`, `index(price_collection_runs.status, started_at desc)`.

### `favorite_cards`

Supabase Auth 사용자별 관심 카드 저장 테이블이다.

| 컬럼         | 타입          | 제약                            | 설명        |
| ------------ | ------------- | ------------------------------- | ----------- |
| `id`         | `uuid`        | PK, default `gen_random_uuid()` | 내부 식별자 |
| `user_id`    | `uuid`        | FK `auth.users(id)`, not null   | 사용자      |
| `card_id`    | `uuid`        | FK `cards(id)`, not null        | 관심 카드   |
| `created_at` | `timestamptz` | not null, default `now()`       | 등록 시각   |

제약/인덱스: `unique(favorite_cards.user_id, favorite_cards.card_id)`, `index(favorite_cards.card_id)`.

### `card_ratings`

Supabase Auth 사용자별 카드 평점(호감도) 저장 테이블이다. 사용자당 카드 1점을 매기고, 카드별 공개 평균은 `get_card_rating_summary(card_id)` RPC로 노출한다.

| 컬럼         | 타입          | 제약                                     | 설명                |
| ------------ | ------------- | ---------------------------------------- | ------------------- |
| `id`         | `uuid`        | PK, default `gen_random_uuid()`          | 내부 식별자         |
| `user_id`    | `uuid`        | FK `auth.users(id)` on delete cascade    | 사용자              |
| `card_id`    | `uuid`        | FK `cards(id)` on delete cascade         | 평가 대상 카드      |
| `score`      | `smallint`    | not null, `check (score between 1 and 5)`| 별점 1~5            |
| `created_at` | `timestamptz` | not null, default `now()`                | 등록 시각           |
| `updated_at` | `timestamptz` | not null, default `now()`                | 수정 시각           |

제약/인덱스: `unique(card_ratings.user_id, card_ratings.card_id)`, `index(card_ratings.card_id)`.

### `get_card_rating_summary(card_id)` (RPC)

`card_ratings`는 RLS로 본인 행만 보이므로, 카드별 공개 평균/표본 수는 `SECURITY DEFINER` 함수로 집계해 노출한다. `(average_score numeric, rating_count int)`를 반환하며, 개별 점수 행은 노출하지 않는다. `search_path = ''`로 고정하고 `anon`, `authenticated`에 `execute`를 부여한다.

## 3. 조회 기준

- 홈: `tcg_games`에서 주요 카테고리를 읽고, `cards.is_featured = true` 카드의 대표 `card_printings`에 최신 `card_price_snapshots`를 붙여 인기 카드 영역을 구성한다.
- 검색 결과: `cards.name`, `cards.normalized_name`, `tcg_games.name`, `card_sets.name`, `card_printings`의 언어/지역/세트/번호를 기준으로 검색하고 최신 가격 스냅샷을 조인한다.
- 카테고리: `card_categories`와 `card_category_links`로 선택 범위에 해당하는 카드를 찾고 최신 가격 스냅샷을 조인한다.
- 상품 상세: `cards` + `card_printings` + `tcg_games` + `card_sets`로 기본 정보를 읽고, 선택한 market/variant/condition/grade 조합의 `card_price_snapshots` 기간별 데이터를 차트로 사용한다.
- 관심 카드: 로그인 사용자의 `favorite_cards`를 `auth.uid()` 기준으로 읽고 쓴다.
- 카드 평점: 로그인 사용자가 `card_ratings`에 본인 점수를 upsert하고, 상세 페이지는 `get_card_rating_summary(card_id)` RPC로 공개 평균/표본 수를 읽는다.
- 가격 수집: source adapter가 `price_collection_runs`를 시작하고 `price_observations`를 저장한 뒤, source 단위 성공/실패를 기록하고 일별 `card_price_snapshots`를 만든다.

## 4. RLS 정책 기준

- 공개 읽기 허용: `tcg_games`, `card_sets`, `cards`, `card_printings`, `card_categories`, `card_category_links`, `card_price_snapshots`.
- 공개 쓰기 금지: 카드/카테고리/가격 데이터는 앱 클라이언트에서 직접 쓰지 않는다.
- 클라이언트 접근 차단: `price_observations`, `price_collection_runs`는 RLS deny-all 정책을 두고 service role 또는 서버 전용 관리 경로에서만 사용한다.
- 사용자별 읽기/쓰기 허용: `favorite_cards`는 `auth.uid() = user_id`인 행만 `select`, `insert`, `delete` 가능하다.
- 사용자별 읽기/쓰기 허용: `card_ratings`는 `auth.uid() = user_id`인 행만 `select`, `insert`, `update`, `delete` 가능하다. 공개 평균은 개별 행을 노출하지 않는 `get_card_rating_summary` RPC로만 읽는다.
- 운영자 데이터 입력: 카드/가격 수집·수정은 Supabase service role 또는 서버 전용 관리 경로에서만 수행한다.

## 5. 후속 확장

- 검색 품질이 필요해지면 `pg_trgm` 또는 Postgres full-text search 인덱스를 추가한다.
- 목록 가격 조회가 느려지면 최신 가격만 모은 `card_price_summaries` view 또는 materialized view를 추가한다.
- 가격 데이터 출처별 인증 정보, ToS 상태, rate limit, adapter 설정이 필요해지면 `price_sources` 테이블로 정규화한다.
- 가격 알림은 `price_alerts`, 보유 컬렉션은 `user_card_collections`로 별도 단계에서 설계한다.

## 6. 변경 이력

- 2026-06-01: KREAM(체결 시세=sold, `source_name='kream'`)과 번개장터(판매중 호가=asking, `source_name='bunjang'`)를 가격 source로 추가. 둘 다 `market='KR'`, `currency='KRW'`로 기존 `price_observations`/`card_price_snapshots` 스키마를 그대로 사용해 **스키마 변경 없음**. 공식 공개 API/재사용 권한이 없어 자동 어댑터(`lib/pricing/kream/`, `lib/pricing/bunjang/`)는 매핑·테스트만 둔 스캐폴드로, `KREAM_COLLECTION_ENABLED`/`BUNJANG_COLLECTION_ENABLED` 플래그로 막혀 있다. 실데이터는 수동 CSV import(`manual_kream` sold, `manual_bunjang` asking)로 적재한다. 상세 차트는 asking source(`ebay_browse`, `bunjang`)를 추세선, sold source(`kream` 등)를 오버레이로 분류하고 KR/KRW 버킷을 우선한다.
- 2026-05-31: TCGdex 공개 REST API에서 포켓몬 세트 단위 카탈로그를 가져와 `card_sets`/`cards`/`card_printings`로 적재하는 반복 실행 ingestion 스크립트(`scripts/import-cards.ts`, `lib/catalog/tcgdex-import.ts`)를 추가. `game → set → cards → printings` 순차 upsert로 멱등하며, 로케일 폴백(`ko → ja → en`)과 매칭 근거를 `card_printings.external_ids`(`tcgdex_id`, `tcgdex_locale`, `tcgdex_match_basis`)에 저장.
- 2026-05-20: 포켓몬 우선 가격 데이터 수집 전략에 맞춰 `card_printings`, `price_observations`, `price_collection_runs`를 추가하고 `card_price_snapshots`를 `card_printing_id` 기준으로 확장.
- 2026-05-20: Supabase MCP migration으로 MVP 스키마를 실제 프로젝트에 적용하고, `favorite_cards` RLS 정책을 Supabase 성능 권장 형태로 최적화.
- 2026-05-31: 카드 평점(호감도) 기능을 위해 `card_ratings` 테이블과 RLS, 공개 평균 집계용 `get_card_rating_summary` RPC를 `create_card_ratings`, `replace_card_rating_summary_view_with_rpc` migration으로 추가.
- 2026-05-20: MVP Supabase Postgres 스키마 초안 작성.
