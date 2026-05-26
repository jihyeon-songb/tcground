# PRD — Pokemon Headless UI

> 웹 접근성을 중심에 둔 Headless UI 컴포넌트 라이브러리 과제 PRD.
> 기존 TCGround 앱은 유지하고, 모노레포 안의 별도 패키지와 문서 사이트로 진행한다.
> 마지막 갱신: 2026-05-26

## 1. 한 줄 요약

Radix UI를 참고해 접근성 좋은 React Headless UI 컴포넌트를 직접 구현하고, Pokemon 테마 토큰과 Docusaurus 문서까지 제공한다.

## 2. 목표

- 버튼, 모달, 드롭다운, 탭, 토글 같은 기본 컴포넌트를 직접 구현한다.
- 스타일은 최소화하고 동작, 상태, 접근성 로직을 컴포넌트의 핵심 가치로 둔다.
- `--pokemon-primary`, `--pokemon-secondary` 같은 CSS 변수 기반 테마 커스터마이징을 지원한다.
- Storybook으로 컴포넌트 상태와 접근성을 검증하고, Docusaurus로 제출 가능한 문서 사이트를 만든다.
- Radix UI의 접근성 구현 방식을 분석하고 유명 headless/accessibility 라이브러리와 비교한다.

## 3. MVP 범위

| 우선순위 | 항목 | 비고 |
| --- | --- | --- |
| P0 | `packages/ui` 패키지 구조 | npm 배포를 염두에 둔 React package |
| P0 | Theme tokens | CSS 변수 기반 색상, radius, focus ring, disabled state |
| P0 | Button | native button, variant, size, `asChild`, disabled |
| P0 | Dialog | focus trap, Escape close, focus restore, ARIA 연결 |
| P0 | Dropdown Menu | menu/menuitem role, trigger 상태, 방향키 이동 |
| P0 | Tabs | tablist/tab/tabpanel role, `aria-selected`, 방향키 이동 |
| P0 | Toggle | `aria-pressed`, controlled/uncontrolled |
| P0 | Docusaurus 문서 | 소개, 설치, 테마, 컴포넌트, 접근성, 리포트 |
| P1 | 고급 메뉴/탭 패턴 | typeahead, nested menu, activation mode |
| P1 | npm publish 자동화 | package metadata, changeset, 배포 검증 |

## 4. 범위 외

- Radix UI를 런타임 의존성으로 감싸는 방식.
- TCGround 가격 추적 기능과 데이터 모델 변경.
- 대규모 트래픽 캐시 전략의 실제 인프라 구현. 해당 내용은 문서 챕터로만 제공한다.

## 5. 요구사항

- 컴포넌트는 controlled/uncontrolled 상태를 모두 고려한다.
- 키보드 조작과 focus 이동은 테스트로 검증한다.
- 접근성 상태는 CSS class만이 아니라 ARIA 속성으로 드러낸다.
- Storybook은 개발/검증용, Docusaurus는 제출/배포용 문서로 역할을 나눈다.
- Docusaurus는 현재 로컬 Node 22에서 빌드 가능한 3.9.2 버전을 사용한다.

## 6. 변경 이력

- 2026-05-26: Headless UI 라이브러리 과제 PRD 생성.
