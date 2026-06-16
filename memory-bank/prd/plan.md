# PRD — TCGround

> Project Requirement Document. 제품의 **무엇을·왜·어디까지** 만들지를 적는다.
> 구현 방법·기술 결정은 `architecture.md`로.
> 마지막 갱신: 2026-06-03 (전체 가격 worklist 확장)

## 1. 제품 한 줄 요약

TCG(Trading Card Game) 카드의 가격을 추적하고, 컬렉터가 정보를 공유할 수 있는 커뮤니티 서비스.

## 2. 비전 / 장기 방향

- 가격 추적 → 커뮤니티 → 중고 거래 → 경매로 단계적 확장.
- 사용자 흐름은 실용적·검색 가능·확장 가능하게 유지한다.
- 별도 과제 산출물로 기존 앱 공통 UI를 패키지화한 `@tcground/ui` 라이브러리와 Docusaurus 문서 사이트를 모노레포 안에 분리해 진행한다. 상세 범위는 `memory-bank/prd/headless-ui.md`를 기준으로 한다.

## 3. 타깃 사용자

- 한국의 포켓몬 카드, 유희왕, 매직 더 개더링 컬렉터.
- 카드 구매 전 적정 가격을 확인하려는 사용자.
- 보유 카드 판매 시점을 판단하려는 사용자.
- 특정 세트나 카드군의 시세 흐름을 추적하려는 사용자.

## 4. 핵심 사용자 시나리오

- 사용자는 홈페이지에서 카드명을 검색하면 기본 카테고리 페이지(`/categories/pokemon`)의 검색 결과 화면으로 이동해 가격 요약을 비교한다.
- 사용자는 공통 헤더에서 홈, 카테고리, 인기 카드 목록으로 이동한다.
- 사용자는 카테고리 페이지의 헤더 검색창으로 카드 이름을 좁히거나, 사이드바 세트/레어도 필터로 탐색한다.
- 사용자는 상품 상세 페이지에서 평균가, 최저가, 최고가, 가격 변동 차트를 확인한다.
- 로그인 사용자는 관심 카드를 저장하고 이후 가격 변동을 추적한다.

## 5. MVP 범위 / 우선순위

> P0 = 반드시 / P1 = 가능하면 / P2 = 후순위.

| 우선순위 | 항목                          | 비고                                                          |
| -------- | ----------------------------- | ------------------------------------------------------------- |
| P0       | 로그인 페이지                 | 이메일/비밀번호 로그인, 실패 처리, 성공 후 이동               |
| P0       | 회원가입 페이지               | 이메일/비밀번호 가입, 인증 메일 확인                          |
| P0       | 검색 가능한 홈페이지          | 검색 진입, 주요 카테고리, 인기/최근 카드 영역                 |
| P0       | 카테고리 대분류/소분류 페이지 | 카테고리 탐색, 카드 이름 검색(`?q=`), 선택 카테고리 카드 목록 |
| P0       | 상품 상세 페이지              | 카드 정보, 평균/최저/최고가, 가격 변동 차트                   |
| P1       | 관심 카드 등록                | 로그인 사용자 대상                                            |
| P1       | 가격 알림                     | 상품 상세 기반 확장                                           |
| P1       | 정렬/필터/자동완성            | 검색 결과와 카테고리 탐색 품질 개선                           |
| P2       | 커뮤니티 게시글               | 가격 추적 MVP 이후                                            |
| P2       | 중고 거래/경매                | 장기 확장                                                     |

## 5.1 데이터/가격 기준

- MVP 대상 TCG는 포켓몬을 우선한다.
- 한국판 포켓몬 카탈로그는 현재 약 3,600개로 충분하므로, 가격 데이터 작업 범위에서 카탈로그 증설은 하지 않는다.
- 가격 기준은 판매중 최저가가 아니라 실거래가 중심으로 둔다. 판매중 호가(`asking`)는 보조 trend 지표로만 사용하고, 실거래가(`sold`)와 섞지 않는다.
- 같은 source에서 sold와 asking이 모두 들어올 수 있으므로 가격 성격은 `source_name`만으로 판단하지 않고 `price_kind`와 snapshot `aggregation_method`로 구분한다.
- 가격 데이터는 단일 현재가가 아니라 `market`, `source`, `condition`, `variant`, `observed_at`를 가진 관측치로 저장하고, 일별 snapshot으로 집계한다.
- P0 자동 수집 source는 eBay Browse API의 판매중 호가 daily snapshot이다. eBay Browse는 sold 실거래 source가 아니다.
- sold 실거래 데이터는 source URL/item ID와 거래일이 검증되는 수동 CSV 또는 승인된 partner/API source만 사용한다. 3,600개 전체 sold 데이터를 수동으로 채우는 것은 목표가 아니다.
- `memory-bank/price-source-validation.csv`의 `sample_id`는 공식 한국 카드 번호 기반 `PKMKR-<card_num>`으로 통일한다. 기존 `KR-*` priority 번호는 `raw_payload_json.worklist_id`에 남기는 alias이며, `exclude_reason=pending_evidence` 후보는 증거가 채워지기 전까지 공개 가격에 쓰지 않는다.
- eBay 원문 접근이 차단된 경우 PriceCharting의 개별 eBay completed-sale 행은 수동 evidence 보조 source로 사용할 수 있다. 집계값/현재가가 아니라 날짜·제목·가격이 있는 개별 sold row만 허용하고, `pricecharting_ebay_sold`로 별도 표기한다.
- eBay Marketplace Insights는 sold 자동화에 가장 적합한 공식 경로지만 restricted 상태이므로, 접근 승인과 API License Agreement 준수 범위가 확인된 뒤에만 production adapter를 활성화한다.
- KREAM 자동 수집은 체결 내역(sold)이 아니라 판매중 호가(`asking`) daily snapshot으로만 사용한다. 기존에 사람이 검증해 넣은 `manual_kream` CSV 행은 과거 체결(sold) evidence로 보존하되, 새 KREAM 자동 결과와 섞지 않는다.
- 번개장터, 중고나라 등 국내 source는 공개 API/재사용 권한 확인 전까지 자동 수집을 opt-in/gated로 두고, 가격 성격(`asking`/`sold`)을 명확히 분리한다.
- USD 등 외화 가격은 원천 통화와 원천 금액을 보존하고, 관측일 또는 snapshot 기준일 환율로 KRW 표시값을 계산한다.
- UI에는 가격 출처, 마지막 업데이트, 표본 수, sold/asking 구분, 환율 기준일을 노출해 가격 신뢰도를 숨기지 않는다.

## 6. 범위 외 (Out of Scope)

현재 단계에서 만들지 **않는다**. 추후 별도 단계.

- 중고 직거래 / 결제
- 경매 시스템
- 모바일 네이티브 앱 (웹 우선)
- 다국어 (한국어 우선)

## 7. 비기능 요구사항

- SEO 친화적 페이지: 카드 상세·게시글 등은 서버 렌더링 + `metadata`.
- 모바일 우선 반응형.
- 접근성: 키보드 조작·포커스·스크린 리더 라벨.
- 모든 사용자 입력은 서버 사이드 검증.
- 명확한 데이터 모델 우선.

## 8. 결정 대기 / 미결 항목

- eBay Marketplace Insights sold production adapter 구현 전 eBay Buy API/Marketplace Insights 접근 승인, 저장/표시/집계 권한, rate limit, 공개 snapshot 표시 범위를 확인한다.
- FX provider는 한국수출입은행 환율 OpenAPI를 1차 후보로 두고, API 키/호출 제한/휴일 rate 처리 정책을 구현 단계에서 확정한다.
- 이미지 저장소: Supabase Storage vs Cloudflare R2
- 카테고리 최종 구조: TCG 종류 / 세트 / 카드 타입 / 레어도 중 MVP 포함 범위

> 결정이 나면 `memory-bank/progress.md`의 "의사결정 로그"에 기록하고 이 섹션에서 제거한다.

## 9. 변경 이력

- 2026-05-06: 초기 PRD 템플릿 생성. 본문은 추후 채움.
- 2026-05-08: MVP 페이지 범위와 우선순위를 로그인, 홈, 검색 결과, 카테고리, 상품 상세 중심으로 정리.
- 2026-05-20: 인증 수단을 Supabase Auth로 확정.
- 2026-05-20: MVP 가격 데이터 수집 전략을 포켓몬 우선, 실거래가 관측치 중심, source별 adapter 구조로 확정.
- 2026-05-21: 한국판 포켓몬 가격 수집은 자동화 전에 source 검증과 10장 수동 import 검증을 선행하도록 구체화.
- 2026-05-20: 회원가입은 Supabase Auth 이메일 인증 방식으로 추가하고, 가입 직후 즉시 로그인 대신 인증 메일 확인 안내를 표시하기로 확정.
- 2026-05-21: MVP 공통 헤더 메뉴를 `홈 / 검색 / 카테고리 / 인기`로 확정.
- 2026-05-22: 한국판 포켓몬 가격의 1차 자동 adapter source를 `ebay_sold`로 결정하되, eBay Marketplace Insights 승인과 API License Agreement 준수 확인 전까지 scraping 자동화는 하지 않기로 확정.
- 2026-05-22: 별도 `/search` 라우트를 폐기하고 카드 이름 검색을 카테고리 페이지(`/categories/[categoryId]?q=...`)로 흡수. 헤더 메뉴는 `홈 / 카테고리 / 인기`로 정리하고, 헤더/홈 검색은 기본 카테고리 `pokemon`으로 진입한다. 다중 TCG가 Supabase에 들어오면 "기본 카테고리"와 cross-TCG 검색 경로를 다시 결정한다.
- 2026-05-22: 카테고리 상세 페이지의 "등록 세트" 그리드(별도 세트 페이지 진입)를 제거하고, 세트 선택을 사이드바 필터로 일원화. 사이드바는 레어도/세트 모두 다중 선택 체크박스로 동작하며 URL 쿼리(`?rarity=SAR,AR&set=pokemon-kr-151,...`)와 즉시 동기화한다. 옵션 목록은 게임 전체 기준으로 항상 노출해 다른 카테고리로 이동 없이 필터를 추가/해제할 수 있게 한다.
- 2026-05-26: 기존 TCGround 앱은 유지하되, 멘토 과제 산출물로 접근성 중심 Headless UI 라이브러리(`packages/ui`)와 Docusaurus 문서 사이트(`apps/docs`)를 모노레포 안에 분리해 진행하기로 결정.
- 2026-05-27: UI 라이브러리 과제 방향을 기존 앱 `components/ui/*` 공통 UI의 패키지화로 전환하고, `packages/ui`를 `@tcground/ui`로 재정의.
- 2026-06-03: 한국판 카탈로그는 약 3,600개로 충분하므로 증설하지 않고, 가격 데이터는 eBay Browse asking daily snapshot + 검증된 수동 sold CSV + 기준일 FX 환산을 P0 전략으로 확정. Marketplace Insights sold 자동화와 국내 source 자동화는 승인/권한 확인 전까지 보류.
- 2026-06-03: 전체 한국판 포켓몬 카탈로그는 `PKMKR-<card_num>` sample id의 `pending_evidence` backlog로 CSV에 추가할 수 있도록 확정. 이는 실제 가격 데이터가 아니라 증거 수집 대기 목록이며, source URL/item ID와 거래일/가격/상태/variant가 검증되기 전까지 공개 가격 산정에서 제외한다.
- 2026-06-15: KREAM 자동 수집 범위를 체결(sold)에서 판매중 호가(asking) snapshot으로 변경. `kream` 자동 source는 `kream_asking_median` snapshot으로 상세 차트 trend에 쓰고, 기존 `manual_kream` CSV sold evidence는 참조점/레거시 체결 근거로 보존한다.
