# 두 카드 시세 비교 — 설계

## 목적

카드 상세에서 진입해 **현재 카드(좌) vs 사용자가 고른 카드(우)** 의 시세를 비교한다.
겹친 지수화 차트 + 좌우 스탯 표로 "어느 카드가 더 올랐나/현재 얼마인가"를 한눈에 본다.

## 결정 사항 (brainstorming)

- **진입**: 카드 상세의 "비교" 버튼 → `/compare?left=<현재카드>`
- **우측 카드 선택**: 검색만 (이름 `ilike`). 최근 본 카드는 후속(이번 범위 아님)
- **비교 내용**: 겹친 차트 + 스탯 표
- **차트 정규화**: 지수화(시작=100%, 변동률 비교)
- **렌더 위치**: 전용 뷰 `/compare?left&right`, URL이 진실
- **차트 구현**: 새 `CompareChart`, 기존 `price-chart.ts` 지오메트리 재사용 (기존 `PriceHistoryChart` 미변경)

## 라우트

`/compare?left=<cardId>&right=<cardId>` — RSC, 상태는 URL에만.

| 파라미터 | 화면 |
|---|---|
| 둘 다 | 2컬럼 비교 (차트 + 표) |
| 하나만 (상세 진입) | 좌 채움, 우는 픽커 |
| 없음 | 좌·우 둘 다 픽커 |

## 데이터

- 서버에서 `getCardDetail(cardId)` 를 좌·우 각각 호출 (기존 함수 재사용).
- `priceHistory.{askingSeries, soldPoints}` + 헤드라인 시세 이미 나옴 — 신규 쿼리 없음.
- 존재하지 않는 cardId → 해당 슬롯을 픽커로 리셋.

## 컴포넌트

- **`app/compare/page.tsx`** (RSC) — searchParams 읽고 좌/우 `getCardDetail` 호출, 하위에 분배.
- **`CardPicker`** (client) — 이름 검색 입력 → 경량 서버액션 결과 리스트. 선택 시 URL의 해당 슬롯(`left`/`right`) 갱신(`router.replace`).
- **`CompareChart`** (client) — 두 시리즈 지수화, `price-chart.ts`의 `filterSeriesByPeriod` 재사용, 좌=색A/우=색B, 기간 탭(7/30/90/1y) 공유, hover 시 양쪽 동시 값.
- **`CompareStatsTable`** — 좌/우 현재가·최저·최고·기간 변동률 대조 (절대가, 각자 통화).

## 신규 서버액션 — 카드 검색

`app/compare/_actions/search-cards.ts` (또는 공용 위치)

- `cards.select(경량컬럼).eq('game_id', …).ilike('name', '%q%').limit(N)` — 기존 `tcg-catalog.ts:746` 패턴 재사용.
- 반환: `{ id, name, imageUrl, setLabel }[]` 정도의 경량 픽커 행.
- 입력 검증: 빈/공백 쿼리 → 빈 배열, 트림, 최소 길이 가드.

## 지수화 로직 — `app/compare/_lib/compare-chart.ts` (테스트 대상)

- 입력: 카드별 트렌드 시리즈(`PricePoint[]`), 활성 기간.
- 각 시리즈 첫 유효점 = 100, 이후 `price / first * 100`.
- 두 시리즈를 같은 시간축(공통 min/max)에 매핑.
- **엣지**:
  - 스냅샷 1개 → 100% 점 하나 (선 없음, 표가 캐리).
  - 빈 시리즈 → 폴백(그 쪽 선 생략, 표는 "데이터 없음").
  - first=0 방어(0 나눗셈).

## 스탯 표 — 우선 가치

카드 94.7%가 스냅샷 1개라 겹친 선은 대부분 점 두개. **표가 주력**, 차트는 데이터 쌓이면 빛남.

| 항목 | 좌 | 우 |
|---|---|---|
| 현재가(헤드라인) | … | … |
| 기간 최저 | … | … |
| 기간 최고 | … | … |
| 기간 변동률(%) | … | … |

## 엣지케이스

- `left == right` → 안내 문구("다른 카드를 고르세요").
- 없는 cardId → 픽커로 리셋.
- 통화 다름 → 표는 각자 통화, 차트는 %라 무관.
- 얇은/빈 데이터 → 명시적 문구(기존 차트의 "수집 중" 톤 재사용).

## 범위 밖 (후속)

- 최근 본 카드 (localStorage 히스토리).
- 3개 이상 비교.
- 카테고리/세트 필터 픽커.

## 테스트

- `compare-chart.test.ts` — 지수화(정상/1점/빈/first=0), 시간축 정렬.
- `search-cards` — 쿼리 트림·빈 입력·limit.
- `page.test.tsx` (선택) — 파라미터 조합별 렌더(둘/하나/없음).
