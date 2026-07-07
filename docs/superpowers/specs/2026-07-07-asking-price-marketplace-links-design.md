# 판매 호가·외부 바로가기 정합성 설계

## 배경

카드 상세 화면은 현재 가격 데이터가 없을 때 카드 번호와 slug로 임의 가격을 만들고, 판매중 호가를 `평균 거래가`로 표시한다. 또한 eBay 개별 매물이 없으면 가격 요약의 공통 `sourceUrl`을 eBay 링크처럼 렌더링하므로 KREAM·번개장터·중고나라로 이동하면서도 eBay로 잘못 표시될 수 있다. 레거시 eBay `source_url`에는 퍼지 매칭으로 다른 카드 URL이 저장된 사례도 있다.

## 목표

- 상세 화면의 대표 가격을 판매중 호가만으로 계산하고 `평균 판매 호가`로 표시한다.
- 가격 데이터가 없는 카드에는 임의 가격을 만들지 않고 `시세 정보 없음`을 표시한다.
- 과거 호가만 있는 경우 마지막 가격을 유지하되 신선도와 현재 매물 미확인 상태를 명시한다.
- 외부 링크의 실제 출처와 UI 라벨을 일치시킨다.
- 검증 가능한 개별 매물이나 출처 URL이 없을 때만 eBay 검색 결과를 사용한다.

## 범위

### 포함

- 상품 상세 가격 요약과 빈 상태
- 상품 상세 외부 바로가기 선택 규칙과 UI
- eBay 검색 fallback URL 생성
- 관련 단위·컴포넌트 테스트
- 상품 상세 PRD와 memory-bank 문서 동기화

### 제외

- 가격 수집 adapter 또는 스케줄 변경
- 기존 snapshot/observation 삭제나 DB migration
- 판매 완료 데이터의 별도 UI 섹션 추가
- 평균 호가 집계 알고리즘 자체 변경

## 가격 표시 정책

1. `asking`으로 분류되는 snapshot만 상세 대표 가격 계산에 사용한다.
2. 최신 asking point의 `avgPrice`, `minPrice`, `maxPrice`를 표시한다.
3. 대표 라벨은 항상 `평균 판매 호가`로 표시한다.
4. asking 이력이 한 번도 없으면 상세 view model의 `price`는 `null`이다. 임의 가격 fallback은 제거한다.
5. 과거 asking 이력이 있으면 마지막 값을 계속 표시한다.
   - 마지막 snapshot이 오늘이면 별도 경고를 표시하지 않는다.
   - 마지막 snapshot이 과거이면 `마지막 수집 N일 전 · 현재 매물 여부 미확인`을 표시한다.
6. sold snapshot은 삭제하지 않지만 대표 가격, 최저가, 최고가 계산에서는 제외한다. 기존 차트의 sold 참고점은 이번 범위에서 유지한다.

현재 데이터 모델은 수집 실패와 실제 매물 0건을 완전히 구분하지 못한다. 따라서 마지막 snapshot 이후 새 snapshot이 없다는 사실만으로 `현재 매물 없음`이라고 단정하지 않는다.

## 외부 바로가기 정책

상세 view model이 UI에 원시 `sourceUrl`을 넘기지 않고, 출처가 명시된 fallback 링크 모델을 만든다. 기존 eBay 개별 매물 목록과 `더보기` 동작은 유지한다. 대표 링크 선택 우선순위는 다음과 같다.

1. 최신 `ebay_browse` snapshot에 필터링된 개별 `listings`가 있으면 대표 eBay 매물을 사용한다.
   - 카드명과 URL, 수집 당시 개별 가격을 표시한다.
   - `바로가기` 가격은 평균 호가와 같은 값이라고 주장하지 않는다.
2. 개별 eBay 매물이 없으면 최신 asking snapshot 중 실제 `source_url`이 있는 행을 사용한다.
   - `source_name`으로 eBay, KREAM, 번개장터, 중고나라 등 실제 출처 라벨을 만든다.
   - 같은 최신 날짜에 후보가 여러 개면 대표 평균 호가에 가장 가까운 source 평균값을 가진 행을 선택한다.
3. 레거시 `ebay_browse.source_url`은 개별 `listings`가 없으면 신뢰하지 않는다. 다른 카드 오염 가능성이 있으므로 eBay 검색 fallback으로 전환한다.
4. 신뢰할 수 있는 출처 URL이 없으면 기존 eBay 검색 키워드 규칙을 재사용해 검색 결과 URL을 만든다.
   - 영문 카드명이 있으면 `영문명 + 카드 번호 + Korean`
   - 영문 카드명이 없으면 `카드 번호 + 세트 코드 + Korean Pokemon`
   - 검색 fallback은 개별 매물 가격을 표시하지 않고 `eBay에서 검색`으로 표시한다.

## 컴포넌트와 데이터 경계

### `lib/tcg-catalog.ts`

- `CatalogCardDetail.price`를 `PriceDisplay | null`로 변경한다.
- asking 이력이 없으면 `null`을 반환하도록 대표 가격 파생 로직을 분리한다.
- 임의 가격 생성 함수와 상세 fallback 사용을 제거한다.
- UI가 URL 도메인을 추측하지 않도록 출처, 링크 종류, 라벨을 포함하는 fallback 링크 view model을 만든다.
- eBay 개별 listing 선택은 eBay asking snapshot의 기준값을 사용해 다른 출처 평균과 결합되지 않도록 한다.

### `lib/pricing/ebay/browse-adapter.ts`

- 기존 검색 키워드 생성기를 유지한다.
- 사람용 eBay 검색 결과 URL 생성기를 export하여 수집 adapter와 상세 fallback이 같은 규칙을 사용하게 한다.

### `app/cards/[cardId]/page.tsx`

- `price === null`이면 가격 숫자, 변화율, 최저가, 최고가 대신 `시세 정보 없음`을 렌더링한다.
- 가격이 있으면 `평균 판매 호가`와 신선도 문구를 렌더링한다.
- 가격 알림처럼 현재 가격의 통화가 필요한 기능은 `price !== null`인 경우에만 현재 동작을 유지하고, 가격이 없으면 가격 알림 진입점을 숨긴다.

### 외부 링크 컴포넌트

- eBay 전용 원시 URL prop인 `fallbackUrl`을 제거한다.
- 기존 eBay 개별 매물 목록을 그대로 지원하면서, 출처가 포함된 fallback 링크 view model을 받아 실제 출처명과 동작을 렌더링한다.
- 개별 매물은 수집 당시 가격을 표시하고, 출처 fallback과 검색 fallback은 값의 의미가 불명확하므로 가격을 표시하지 않는다.

## 오류·엣지 케이스

- 잘못된 URL 또는 지원하지 않는 프로토콜은 링크 후보에서 제외한다.
- 알 수 없는 `source_name`은 내부 식별자를 그대로 노출하지 않고 일반 `외부 판매처` 라벨을 사용한다.
- 과거 eBay item URL만 있고 listings가 없으면 해당 item으로 직접 이동하지 않는다.
- sold 데이터만 있는 카드는 대표 가격 없이 `시세 정보 없음`을 표시한다.
- eBay 검색 키워드 구성 요소가 일부 없더라도 카드 번호·세트 코드 중 사용 가능한 값으로 URL을 만든다.

## 테스트 전략

### 카탈로그 단위 테스트

- asking 이력이 없고 sold만 있을 때 대표 가격이 `null`인지 검증한다.
- snapshot이 전혀 없을 때 임의 가격이 생성되지 않는지 검증한다.
- 과거 asking이 마지막 가격과 staleness를 유지하는지 검증한다.
- 최신 eBay listings가 있으면 검증된 개별 URL을 선택하는지 검증한다.
- KREAM·번개장터·중고나라 source URL을 실제 출처 라벨로 반환하는지 검증한다.
- 오염된 레거시 eBay source URL을 배제하고 검색 fallback을 만드는지 검증한다.

### 페이지·컴포넌트 테스트

- 가격이 없을 때 `시세 정보 없음`을 렌더링하고 임의 가격·변화율을 렌더링하지 않는지 검증한다.
- 가격이 있을 때 `평균 판매 호가`를 렌더링하는지 검증한다.
- 오래된 가격에 `현재 매물 여부 미확인`을 렌더링하는지 검증한다.
- 각 marketplace 링크가 올바른 라벨, URL, 가격 표시 정책을 따르는지 검증한다.

### 품질 게이트

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test --run
```

## 문서 동기화

- `memory-bank/prd/product-detail.md`: 대표 가격을 평균 판매 호가로 변경하고 빈 상태·과거 호가 정책을 명시한다.
- `memory-bank/architecture.md`: deterministic 가격 fallback 설명을 제거하고 source-aware link view model을 기록한다.
- `memory-bank/implementation-plan.md`: 구현 작업과 영향 파일, 완료 조건을 추가한다.
- `memory-bank/progress.md`: 승인된 결정과 구현 완료 결과를 기록한다.
- 필요한 경우 `memory-bank/trouble-shooting.md`: 레거시 eBay source URL 오염과 fallback 금지 기준을 재발 방지 항목으로 기록한다.

## 완료 기준

- 상세 화면에 임의 가격이 표시되지 않는다.
- 대표 숫자는 판매중 호가 snapshot에서만 나온다.
- 오래된 호가는 현재 가격으로 오인되지 않도록 신선도가 표시된다.
- eBay UI가 다른 marketplace URL로 이동하지 않는다.
- 직접 링크가 불가능한 경우 안전한 eBay 검색 결과로 이동한다.
- 관련 테스트와 품질 게이트가 통과하고 문서 흐름이 동기화된다.
