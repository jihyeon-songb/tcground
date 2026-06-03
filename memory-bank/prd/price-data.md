# PRD — 가격 데이터 전략

> 한국판 카탈로그는 이미 약 3,600개로 MVP 탐색에 충분하다. 이 문서는 카탈로그 증설이 아니라 가격 데이터의 신뢰도, 원화 환산, 차트용 시계열 확보 범위만 정의한다.
> 마지막 갱신: 2026-06-03 (전체 가격 worklist 확장)

## 1. 배경

TCGround의 가격 경험은 "많은 숫자"보다 "검증 가능한 숫자"가 우선이다. 한국판 포켓몬 카드는 세트, collector number, 언어, raw/graded, 상태에 따라 가격이 크게 달라지므로, 출처와 매칭 근거가 불명확한 평균가는 공개하지 않는다.

현재 확인된 카탈로그 수량은 약 3,600개로 충분하다. 이번 범위에서 카탈로그를 더 늘리지 않는다.

## 2. 목표

- 한국판 카드 상세에서 신뢰 가능한 가격만 보여준다.
- 판매중 호가(`asking`)와 실거래가(`sold`)를 섞지 않는다.
- USD 등 외화 가격은 원천 통화와 금액을 보존하면서 기준일 환율로 KRW 표시를 제공한다.
- 가격 변동 그래프를 만들 수 있도록 일정 기간의 일별 snapshot을 누적한다.
- UI에 가격 출처, 표본 수, 마지막 업데이트, sold/asking 구분, 환율 기준일을 노출한다.

## 3. 비목표

- 한국판 카탈로그 3,600개를 더 늘리지 않는다.
- 3,600개 카드 전체에 대해 수동 sold 데이터를 억지로 만들지 않는다.
- KREAM, 번개장터, 중고나라, 당근 등 국내 거래처를 공개 API/파트너 권한 없이 자동 scraping하지 않는다.
- eBay Marketplace Insights 승인 전에는 sold 자동 수집을 production 기능으로 약속하지 않는다.
- raw, graded, bundle, sealed, 다른 언어판, 다른 collector number를 같은 가격 bucket으로 합치지 않는다.

## 4. Source 정책

| Source                               | 가격 종류            | 신뢰 판단                                                                 | MVP 사용                            |
| ------------------------------------ | -------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| eBay Browse API                      | asking               | eBay 공식 Buy API로 검색 가능한 판매중 listing. sold 데이터가 아니다.     | P0: 일별 호가 trend 누적            |
| 수동 CSV sold                        | sold                 | source URL, 거래일, 가격, 통화, 카드 식별 근거가 있는 수동 검증 행만 허용 | P0: priority 카드 실거래 overlay    |
| PriceCharting 개별 eBay sold 행      | sold                 | PriceCharting historic sales 표의 개별 eBay completed-sale 행. eBay 원문 접근이 차단될 때 보조 evidence로만 사용 | P0: 수동 CSV 보강 source, confidence 보수 적용 |
| eBay Marketplace Insights            | sold                 | 공식 sold 경로지만 restricted이고 신규 사용자에게 열려 있지 않음          | P1: 승인 후에만 adapter 활성화      |
| KREAM/번개장터/중고나라              | sold/asking 후보     | 국내 체감 시세에는 유용하나 공개 API와 재사용 권한이 확인되지 않음        | P0: 수동 evidence만, 자동 수집 금지 |
| PriceCharting/Guardian/Cardmarket 등 | estimate/cross-check | 개별 sold 표본이 아니거나 접근/신청 제한이 있음                           | P2: 교차검증 보조                   |
| 한국수출입은행 환율 정보             | FX                   | 공공데이터포털에 등록된 환율 OpenAPI                                      | P0: 외화→KRW 환산 기준              |

## 5. 수동 sold 데이터 운영 범위

3,600개 전체 sold 데이터를 수동으로 만드는 것은 목표가 아니다. 만들 수 있는 것은 "카드별 sold row"가 아니라 "증거가 있는 거래 관측치"다. 증거 없이 숫자만 채우면 가격 정확도를 해친다.

운영 방식은 다음 순서로 제한한다.

1. 우선순위 카드 50~100개를 선정한다. 기준은 인기 검색, 고가 카드, 상세 유입, 가격 변동성이다.
2. 카드별 raw 기준 sold 표본 3개 이상을 1차 목표로 한다.
3. source URL 또는 item ID, 거래일, 원천 통화, 원천 가격, 상태/variant, matching confidence를 필수로 둔다.
4. 표본 3개 미만이면 평균가를 공개하지 않고 "실거래 데이터 부족" 상태를 표시한다.
5. 이후 필요할 때 100~200개까지 실제 evidence 수집 범위를 확장하되, 전수 수동 sold 채우기는 하지 않는다.
6. 전체 카탈로그는 증거 수집 누락을 막기 위한 `pending_evidence` backlog로만 둘 수 있다. 이 backlog는 공개 가격 데이터가 아니며, source URL/item ID와 거래일/가격이 채워지기 전까지 파서와 집계가 제외한다.

### 5.1 우선순위 카드 worklist (KR-001 ~ KR-110)

우선순위 카드는 `price-source-validation.csv`의 `sample_id`로 식별하며, 각 카드는 DB `card_printings.external_ids.sample_id`에 매핑돼 있다.

- **KR-001 ~ KR-010**: 증거 적재 완료(eBay sold·KREAM·번개·중고나라 검증 관측치 보유).
- **KR-011 ~ KR-060**: 인기/고가 chase 카드 50종 선정 완료(이브이 진화 SAR, 151 AR/SAR, 샤이니트레저·로켓단의 영광·블랙볼트/화이트플레어 SAR/UR 등). 한국 IP 브라우저 세션(`scripts/collect-prices.ts --kream --ebay-scrape`) 또는 수동 증거 입력으로 카드당 sold 표본 3개 이상을 채우면 공개 대상이 된다.
- 2026-06-03 보강으로 `KR-011`~`KR-019`, `KR-021`~`KR-027`, `KR-030`, `KR-031`, `KR-036`, `KR-037`, `KR-039`는 PriceCharting 개별 eBay completed-sale 행 기준 카드당 raw sold 표본 3개를 확보했고, CSV에서는 해당 sample의 pending placeholder를 제거했다. `KR-020`, `KR-028`, `KR-029`, `KR-032`~`KR-035`, `KR-038`, `KR-040`~`KR-060`은 아직 source별 raw sold 3개 미만이므로 `exclude_reason=pending_evidence` 상태를 유지한다.
- **KR-061 ~ KR-110**: 추가 chase 카드 50종 선정(151 스타팅 라인 AR·후딘 SAR, 흑염 마기라스·토게키스, 샤이니트레저 스타터 SAR, 테라스탈 페스타 갸라도스·뮤츠 SAR, 스칼렛/바이올렛 ex 미라이돈·마스카나·웨이니발, 로켓단의 영광·화이트플레어·블랙볼트 SAR/UR, 배틀파트너즈 N/릴리에 SAR, 변환의 가면 오거폰·그우린차, 레이징서프·낙원드래고나·와일드포스·사이버저지·크림슨헤이즈·스텔라미라클 SAR/UR 등). KR-011~KR-060과 동일하게 `exclude_reason=pending_evidence` 스켈레톤 행이며, 세트/번호/희귀도는 잠정값(memo에 "세트/번호/희귀도 잠정 — 증거 확인 시 확정" 표기)으로 증거 수집 단계에서 카탈로그와 대조해 확정한다.

### 5.2 전체 카탈로그 pending backlog (PKMKR-*)

사용자가 전체 3,600여 카드에 대해 데이터 누락 없이 추적할 수 있도록, `price-source-validation.csv`는 우선순위 `KR-*` worklist와 별도로 전체 한국판 카탈로그 pending backlog를 가진다.

- `PKMKR-*` sample id는 공식 한국 카드 번호 `card_printings.external_ids.card_num`에서 만든다.
- 2026-06-03 기준 Supabase 한국판 프린팅 3,668개 중 기존 CSV에서 이미 커버된 476개를 제외하고 `PKMKR-*` pending 행 3,192개를 추가했다.
- `PKMKR-*` 행은 모두 `source_name=pending`, `exclude_reason=pending_evidence`이므로 공개 가격 산정, sold snapshot, 평균/중앙값 집계에 쓰이지 않는다.
- 실제 source URL/item ID, 거래일, 원천 가격/통화, 상태/variant, matching confidence가 확인되면 해당 pending 행을 실제 evidence 행으로 교체하거나 같은 sample id의 evidence 행을 추가한 뒤 pending을 제거한다.
- DB row를 매번 수정하지 않아도 import가 해소되도록 CSV resolver는 `external_ids.card_num`을 `PKMKR-<card_num>` sample id로 매핑한다.

## 6. 환율 요구사항

- 모든 가격 관측치는 원천 금액과 원천 통화를 보존한다.
- USD 등 외화 관측치는 관측일 기준 FX rate로 KRW 표시값을 계산한다.
- 환율 row에는 `base_currency`, `quote_currency`, `rate`, `rate_date`, `provider`, `fetched_at`를 저장한다.
- sold 관측치는 `sold_at` 날짜 기준 환율을 우선 사용하고, asking snapshot은 `snapshot_date` 기준 환율을 사용한다.
- 주말/휴일 등 해당일 환율이 없으면 provider가 제공하는 직전 영업일 rate를 사용할 수 있지만, UI에는 환율 기준일을 표시한다.
- 원천 가격과 KRW 환산 가격을 둘 다 추적할 수 있어야 하며, 집계는 같은 표시 통화 기준으로만 비교한다.

## 7. 차트 요구사항

- 기본 차트 기간은 90일이다.
- 데이터가 충분하면 30일, 90일, 180일, 365일 탭을 제공한다.
- eBay Browse asking은 daily snapshot으로 선 그래프를 만든다. Browse는 과거 backfill이 불가능하므로 배포 이후 매일 누적해야 한다.
- sold 관측치는 거래일 기준 point overlay로 표시한다.
- sold 평균/중앙값은 같은 카드 printing, 같은 variant, 같은 condition bucket, 같은 표시 통화 기준 표본 3개 이상일 때만 공개한다.
- 차트에는 asking line과 sold point를 시각적으로 구분하고, legend에 source와 sample count를 표시한다.
- 기간 내 데이터가 부족하면 빈 그래프 대신 "가격 데이터 부족" 상태와 필요한 조건을 보여준다.

## 8. 매칭/제외 규칙

snapshot 입력은 다음 조건을 모두 통과해야 한다.

- `card_printing_id`가 확정되어야 한다.
- 카드명, 세트 코드 또는 세트명, collector number, 언어가 충돌하지 않아야 한다.
- `variant=raw`와 graded/slab을 분리한다.
- bundle, lot, pack, box, sealed product, proxy/orica, damaged-only 거래는 기본 raw snapshot에서 제외한다.
- `confidence_score < 0.8`인 sold 관측치는 공개 평균 집계에서 제외한다.
- source별 item ID 또는 source URL로 중복을 제거한다.
- 이상치 제거 후 `sample_count < 3`이면 평균/중앙값 snapshot을 공개하지 않는다.

## 9. 구현 순서

1. 이 PRD와 제품 PRD, 실행 계획, 진행 로그를 동기화한다.
2. FX 저장 모델과 환율 수집 경로를 추가한다. Supabase 스키마 변경은 MCP 또는 CLI만 사용한다.
3. 가격 집계에서 원천 통화와 KRW 표시 통화를 분리하고, 외화 snapshot은 기준일 환율로 환산한다.
4. 카드 상세 차트에 환율 기준일, sold/asking 구분, source, sample count를 노출한다.
5. priority 카드 50~100개의 수동 sold CSV 보강 workflow를 만든다.
6. 배포 후 eBay Browse daily collection이 최소 7일 이상 누적되는지 검증한다.

## 10. 컨텍스트 클리어 후 인수인계

다음 작업자는 이 파일을 먼저 읽고 다음 결론을 유지해야 한다.

- 카탈로그 증설은 이번 범위가 아니다.
- 자동 sold source는 아직 확실하지 않다. eBay Marketplace Insights 승인 전에는 sold 자동화를 보류한다.
- P0 자동 수집은 eBay Browse asking daily snapshot이다.
- sold는 검증 가능한 수동 CSV 또는 승인된 파트너 source만 사용한다.
- 외화 가격은 원천 통화를 버리지 말고 기준일 환율로 KRW 표시를 추가한다.
- 그래프는 기간 데이터가 쌓인 범위만 보여주며, 데이터 부족 상태를 숨기지 않는다.
