# DB SCHEMA

> TCGround MVP Supabase Postgres 데이터 모델 설계.
> 마지막 갱신: 2026-05-20

## 1. 목적과 범위

이 문서는 MVP P0/P1에 필요한 카드 탐색, 검색, 상품 상세 가격 차트, Supabase Auth 기반 관심 카드 저장을 지원하는 DB 설계의 단일 출처다.

실제 Supabase 적용은 별도 migration 또는 Supabase MCP 실행 단계에서 진행한다.

## 2. Supabase Postgres 스키마 초안

### `tcg_games`

TCG 대분류(포켓몬, 유희왕, 매직 등)의 기준 테이블이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | 내부 식별자 |
| `slug` | `text` | unique, not null | URL/필터 식별자. 예: `pokemon` |
| `name` | `text` | not null | 표시 이름. 예: `Pokemon` |
| `name_ko` | `text` | nullable | 한국어 표시 이름. 예: `포켓몬` |
| `description` | `text` | nullable | 카테고리 소개 |
| `display_order` | `integer` | not null, default `0` | 홈/카테고리 정렬 |
| `created_at` | `timestamptz` | not null, default `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | not null, default `now()` | 수정 시각 |

인덱스: `unique(tcg_games.slug)`, `index(tcg_games.display_order)`.

### `card_sets`

세트/확장팩 단위 탐색과 상세 페이지의 세트명을 담당한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | 내부 식별자 |
| `game_id` | `uuid` | FK `tcg_games(id)`, not null | 소속 TCG |
| `slug` | `text` | not null | URL/필터 식별자. 예: `base-set` |
| `name` | `text` | not null | 세트명. 예: `Base Set` |
| `name_ko` | `text` | nullable | 한국어 세트명 |
| `released_on` | `date` | nullable | 출시일 |
| `card_count` | `integer` | nullable | 세트 내 카드 수 |
| `created_at` | `timestamptz` | not null, default `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | not null, default `now()` | 수정 시각 |

인덱스: `unique(card_sets.game_id, card_sets.slug)`, `index(card_sets.game_id)`.

### `cards`

홈 인기 카드, 검색 결과, 카테고리 목록, 상품 상세의 공통 원천이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | 내부 식별자 |
| `game_id` | `uuid` | FK `tcg_games(id)`, not null | 소속 TCG |
| `set_id` | `uuid` | FK `card_sets(id)`, nullable | 소속 세트 |
| `slug` | `text` | unique, not null | 상세 URL 식별자. 예: `charizard-base-set-1st-edition` |
| `name` | `text` | not null | 카드명 |
| `normalized_name` | `text` | not null | 검색 정규화 이름 |
| `collector_number` | `text` | nullable | 카드 번호 |
| `rarity` | `text` | nullable | 레어도 |
| `condition_label` | `text` | nullable | 대표 컨디션/그레이딩 라벨 |
| `image_url` | `text` | nullable | 상세 이미지 |
| `thumbnail_url` | `text` | nullable | 목록 썸네일 |
| `is_featured` | `boolean` | not null, default `false` | 홈 인기 카드 노출 여부 |
| `created_at` | `timestamptz` | not null, default `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | not null, default `now()` | 수정 시각 |

인덱스: `unique(cards.slug)`, `index(cards.game_id)`, `index(cards.set_id)`, `index(cards.normalized_name)`, `index(cards.is_featured)`.

### `card_categories`

카테고리 페이지와 필터에 쓰는 탐색용 분류 마스터다. TCG 대분류, 레어도, 카드 타입, 시대 같은 범주를 같은 구조로 다룬다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | 내부 식별자 |
| `game_id` | `uuid` | FK `tcg_games(id)`, nullable | 특정 TCG 전용 분류일 때 사용 |
| `parent_id` | `uuid` | self FK `card_categories(id)`, nullable | 상위 카테고리 |
| `type` | `text` | not null | `game`, `set`, `rarity`, `card_type`, `era` 등 |
| `slug` | `text` | not null | URL/필터 식별자 |
| `name` | `text` | not null | 표시 이름 |
| `display_order` | `integer` | not null, default `0` | 표시 순서 |
| `created_at` | `timestamptz` | not null, default `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | not null, default `now()` | 수정 시각 |

인덱스: `unique(card_categories.type, card_categories.slug)`, `index(card_categories.parent_id)`, `index(card_categories.game_id)`, `index(card_categories.display_order)`.

### `card_category_links`

카드와 탐색 카테고리의 다대다 연결 테이블이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `card_id` | `uuid` | FK `cards(id)`, not null | 카드 |
| `category_id` | `uuid` | FK `card_categories(id)`, not null | 카테고리 |
| `created_at` | `timestamptz` | not null, default `now()` | 생성 시각 |

제약/인덱스: `primary key(card_id, category_id)`, `index(card_category_links.category_id)`.

### `card_price_snapshots`

상품 상세 가격 차트와 검색/목록 가격 요약의 기준 데이터다. MVP에서는 최신 스냅샷을 현재 가격 요약으로 사용한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | 내부 식별자 |
| `card_id` | `uuid` | FK `cards(id)`, not null | 카드 |
| `snapshot_date` | `date` | not null | 가격 기준일 |
| `currency` | `text` | not null, default `'KRW'` | 통화 |
| `avg_price` | `integer` | nullable | 평균 거래가 |
| `min_price` | `integer` | nullable | 최저가 |
| `max_price` | `integer` | nullable | 최고가 |
| `sample_count` | `integer` | nullable | 가격 산정 표본 수 |
| `source_name` | `text` | nullable | 가격 데이터 출처명 |
| `source_url` | `text` | nullable | 출처 URL |
| `created_at` | `timestamptz` | not null, default `now()` | 생성 시각 |

제약/인덱스: `unique(card_id, snapshot_date, currency, source_name)`, `index(card_price_snapshots.card_id, snapshot_date desc)`.

### `favorite_cards`

Supabase Auth 사용자별 관심 카드 저장 테이블이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | 내부 식별자 |
| `user_id` | `uuid` | FK `auth.users(id)`, not null | 사용자 |
| `card_id` | `uuid` | FK `cards(id)`, not null | 관심 카드 |
| `created_at` | `timestamptz` | not null, default `now()` | 등록 시각 |

제약/인덱스: `unique(favorite_cards.user_id, favorite_cards.card_id)`, `index(favorite_cards.card_id)`.

## 3. 조회 기준

- 홈: `tcg_games`에서 주요 카테고리를 읽고, `cards.is_featured = true` 카드에 최신 `card_price_snapshots`를 붙여 인기 카드 영역을 구성한다.
- 검색 결과: `cards.name`, `cards.normalized_name`, `tcg_games.name`, `card_sets.name`을 기준으로 검색하고 최신 가격 스냅샷을 조인한다.
- 카테고리: `card_categories`와 `card_category_links`로 선택 범위에 해당하는 카드를 찾고 최신 가격 스냅샷을 조인한다.
- 상품 상세: `cards` + `tcg_games` + `card_sets`로 기본 정보를 읽고, `card_price_snapshots`의 기간별 데이터를 차트로 사용한다.
- 관심 카드: 로그인 사용자의 `favorite_cards`를 `auth.uid()` 기준으로 읽고 쓴다.

## 4. RLS 정책 기준

- 공개 읽기 허용: `tcg_games`, `card_sets`, `cards`, `card_categories`, `card_category_links`, `card_price_snapshots`.
- 공개 쓰기 금지: 카드/카테고리/가격 데이터는 앱 클라이언트에서 직접 쓰지 않는다.
- 사용자별 읽기/쓰기 허용: `favorite_cards`는 `auth.uid() = user_id`인 행만 `select`, `insert`, `delete` 가능하다.
- 운영자 데이터 입력: 카드/가격 수집·수정은 Supabase service role 또는 서버 전용 관리 경로에서만 수행한다.

## 5. 후속 확장

- 검색 품질이 필요해지면 `pg_trgm` 또는 Postgres full-text search 인덱스를 추가한다.
- 목록 가격 조회가 느려지면 최신 가격만 모은 `card_price_summaries` view 또는 materialized view를 추가한다.
- 가격 데이터 출처가 복수 사업자로 확정되면 `price_sources` 테이블로 정규화한다.
- 가격 알림은 `price_alerts`, 보유 컬렉션은 `user_card_collections`로 별도 단계에서 설계한다.

## 6. 변경 이력

- 2026-05-20: MVP Supabase Postgres 스키마 초안 작성.
