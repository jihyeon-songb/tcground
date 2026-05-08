# AGENTS.md

> AI 코딩 에이전트(Claude / Cursor / Copilot 등) 진입점.
> 룰 본문은 `memory-bank/`에 있다. 이 파일은 "어디를 보고 어디에 기록할지"만 적는다.
> 마지막 갱신: 2026-05-08

## 작업 시작 전 — 반드시 읽기

| 파일                                 | 무엇이 적혀 있나                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `memory-bank/prd/plan.md`            | 제품 전체 PRD. MVP 범위·우선순위·미결정 사항의 기준                                   |
| `memory-bank/prd/*.md`               | 페이지/기능별 PRD(목표·사용자 스토리·요구사항). **구현 시 최우선 기준**               |
| `memory-bank/architecture.md`        | 전체 도메인 구조·데이터 모델·UI/UX 가이드·기술 스택·디렉터리 구조·수정 허용/금지 범위 |
| `memory-bank/conventions.md`         | 명명 규칙·코딩 스타일·테스트·커밋 컨벤션                                              |
| `memory-bank/implementation-plan.md` | PRD를 단계·작업으로 분해한 실행 계획. 다음 단계·남은 작업의 기준                      |
| `memory-bank/progress.md`            | 언제 무엇을 구현했는지, 현재 상태, 의사결정 로그                                      |
| `memory-bank/trouble-shooting.md`    | 엣지 케이스·예외 상황·트러블슈팅 로그                                                 |

## 작업 완료 후 — 반드시 업데이트

- `memory-bank/progress.md` — "현재 작업"에서 빼고 "완료" 로그에 한 줄(날짜·기능·결과). 비자명한 의사결정도 같이 기록.
- `memory-bank/implementation-plan.md` — 끝낸 단계 체크, 다음 단계·남은 작업 갱신.
- 새 디렉터리·새 의존성·도메인/데이터 모델/UI 변경: `memory-bank/architecture.md` 또는 `memory-bank/conventions.md` 갱신.
- PRD 범위·우선순위 변경: 관련 `memory-bank/prd/*.md` 갱신(아래 "결정·범위 변경 처리" 절차 따름). 제품 전체 범위 변경은 `memory-bank/prd/plan.md`에도 반영.
- PRD에 없던 엣지 케이스/이슈 발생: `memory-bank/trouble-shooting.md`에 기록(필요 시 PRD에도 반영).

## 문서 흐름 (PRD → 실행 계획 → 진행 로그)

기능 단위로 다음 한 흐름을 유지한다. 세 문서는 항상 같은 방향을 가리켜야 하며, 한쪽만 갱신되면 흐름이 끊긴다.

1. **PRD** (`memory-bank/prd/*.md`) — _무엇을·왜_ 만드는가. 목표·사용자 스토리·요구사항.
2. **실행 계획** (`memory-bank/implementation-plan.md`) — _어떻게_ 만드는가. PRD를 단계·작업으로 분해. 다음 단계와 남은 작업의 단일 출처.
3. **진행 로그** (`memory-bank/progress.md`) — _언제·무엇을_ 했는가. 완료된 기능, 현재 상태, 의사결정 기록.

코드를 바꾸기 전에 PRD를 보고, 실행 계획대로 작업하고, 끝나면 진행 로그에 남긴다. 어긋나는 게 보이면 그 작업의 본 흐름을 먼저 맞춘 뒤 코드를 건드린다.

## 결정·범위 변경 처리

중요한 결정이나 기능 범위 변경이 발생하면, 흐름의 무결성을 위해 다음 순서를 따른다.

1. **먼저 `memory-bank/`에 기록.** 결정 배경·고려한 대안·선택 이유·영향 범위를 `progress.md`(의사결정 로그) 또는 `implementation-plan.md`(단계 변경)에 남긴다.
2. **PRD에 요약 반영.** 결정의 *결과*만 추려 관련 `memory-bank/prd/*.md`의 요구사항/범위/우선순위에 반영한다. 제품 전체 범위·우선순위는 `memory-bank/prd/plan.md`에도 반영한다. 컨텍스트는 memory-bank에, 최종 사양은 PRD에.
3. **실행 계획·진행 로그 동기화.** 단계 추가/삭제/순서 변경, 차후 작업 목록을 모두 맞춘다.

PRD를 먼저 고치지 않는 이유: memory-bank는 *왜 그렇게 됐는지*의 흔적을 남기는 곳이고, PRD는 *지금의 정답*만 담아야 하기 때문이다.

## 핵심 명령어

| 작업                 | 명령어                                       |
| -------------------- | -------------------------------------------- |
| 설치                 | `pnpm install`                               |
| 개발 서버            | `pnpm dev`                                   |
| 테스트               | `pnpm test` (감시) / `pnpm test --run` (1회) |
| 린트                 | `pnpm lint`                                  |
| 타입 체크            | `pnpm exec tsc --noEmit`                     |
| 빌드                 | `pnpm build`                                 |
| 포맷                 | `pnpm format` / `pnpm format:check`          |
| Supabase 스키마/설정 | Supabase MCP(또는 CLI)로만 조회·변경         |

## 품질 게이트 (PR 머지 전 모두 통과)

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test --run
```

## 기능 구현 규칙

- 기능 구현을 시작하기 전에 반드시 `memory-bank/prd/*.md`(기능 명세서) 존재 여부를 확인한다. 존재하면 그 안의 **목표·사용자 스토리·요구사항**을 최우선 기준으로 삼아 구현한다.
- PRD가 있으면 다음으로 `implementation-plan.md`에서 해당 기능의 단계·다음 작업을 확인하고, 그 순서를 따른다.
- PRD 내용과 사용자의 채팅 지시가 **상충**될 경우, 자체 판단으로 진행하지 말고 사용자에게 우선순위를 확인한다.
- PRD에 정의되지 않은 **엣지 케이스/예외 상황**을 발견하면, 즉시 사용자에게 알리고 ① `memory-bank/trouble-shooting.md` 기록 또는 ② 해당 PRD 업데이트를 제안한다.
- 중요한 결정·범위 변경은 위 "결정·범위 변경 처리" 절차에 따라 **memory-bank → PRD → 실행 계획 → 진행 로그** 순서로 동기화한다.
- **Supabase 테이블/설정**을 확인하거나 변경할 때는 반드시 Supabase MCP(또는 CLI)를 사용한다. 대시보드 수동 변경·임시 SQL 직접 실행은 일관성을 깨므로 금지한다.

## 작업 방식

1. **읽기 먼저.** 관련 `memory-bank/prd/*.md`로 범위·요구사항을, `implementation-plan.md`로 다음 단계를, `progress.md`로 진행 상황을 확인한다.
2. **메모리 뱅크 시작.** `progress.md`의 "현재 작업"에 항목을 추가한다.
3. **계획.** 실행 계획의 해당 단계 아래에 영향 파일 목록과 최소 변경 범위를 적는다. PRD 누락 사항이 있으면 이 시점에 사용자에게 확인.
4. **추측 금지.** 모르는 동작은 코드·문서·테스트로 확인. 안 되면 사용자에게 묻는다.
5. **작은 변경.** 한 PR은 한 가지 변경만. 리팩토링과 기능 추가를 섞지 않는다.
6. **품질 게이트 통과 후 완료.** 위 명령들을 모두 통과시킨 뒤에만 작업 완료로 간주.
7. **메모리 뱅크 마감.** `progress.md`에 완료 한 줄 + 의사결정, `implementation-plan.md`에서 끝낸 단계 체크·다음 단계 정리. 트러블이 있었다면 `trouble-shooting.md`에도 기록.

## 절대 금지

- 시크릿·API 키·개인정보를 코드·로그·테스트 픽스처에 포함
- `.env*` 커밋 (`.env.example`만 허용)
- 의존성 변경 의도 없이 `pnpm-lock.yaml` 수정
- 한글 식별자(변수·함수·파일명)
- Supabase 스키마/설정을 MCP·CLI 이외 경로로 변경
- PRD를 무시하고 사용자 채팅 지시만으로 기능 구조를 임의 결정
- 중요한 결정·범위 변경을 memory-bank 기록 없이 PRD나 코드에만 반영(흐름 단절)
