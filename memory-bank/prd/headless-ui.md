# PRD — TCGround UI Library

> 기존 TCGround 앱의 공통 UI 컴포넌트를 재사용 가능한 UI 라이브러리로 분리하는 과제 PRD.
> 기존 TCGround 앱은 유지하고, 모노레포 안의 별도 패키지와 문서 사이트로 진행한다.
> 마지막 갱신: 2026-05-28

## 1. 한 줄 요약

기존 앱 화면을 구성하던 `components/ui/*` shadcn 기반 공통 UI 컴포넌트를 `packages/ui` 패키지로 분리하고, 앱·문서·Storybook이 같은 라이브러리 컴포넌트를 사용하게 만든다.

## 2. 목표

- 기존 TCGround 앱의 `components/ui/*` 공통 UI 컴포넌트를 라이브러리 패키지로 이동한다.
- 앱 도메인 컴포넌트(`components/tcg/*`)와 라우트/데이터 코드는 라이브러리 범위에서 제외한다.
- Tailwind v4, shadcn CSS 변수, Radix primitives 기반의 현재 시각/상호작용 품질을 유지한다.
- Storybook으로 라이브러리 컴포넌트의 상태를 확인하고, Docusaurus로 제출 가능한 문서 사이트를 만든다.
- 기존 앱은 점진적으로 `@tcground/ui`를 소비하게 만들어 실제 사용처가 있는 UI 라이브러리로 검증한다.

## 3. MVP 범위

| 우선순위 | 항목                      | 비고                                               |
| -------- | ------------------------- | -------------------------------------------------- |
| P0       | `packages/ui` 패키지 구조 | `@tcground/ui` 성격의 React UI package             |
| P0       | shadcn 공통 UI 이전       | `components/ui/*` 중 앱 공통 UI 컴포넌트           |
| P0       | Theme token contract      | `app/globals.css`의 shadcn/Tailwind 변수 계약 유지 |
| P0       | 앱 소비 전환              | 기존 앱이 필요한 UI 컴포넌트를 패키지에서 import   |
| P0       | Storybook                 | `packages/ui` 컴포넌트 상태 확인 중심              |
| P0       | Docusaurus 문서           | 설치, 테마, 컴포넌트 사용법                        |
| P1       | 패키지 공개 준비          | package metadata, exports, changeset, 배포 검증    |
| P1       | 도메인 UI 후보 검토       | 앱 전용 성격이 약한 컴포넌트만 별도 평가           |

## 4. 범위 외

- `components/tcg/*` 도메인 컴포넌트의 무리한 패키지화.
- TCGround 가격 추적 기능과 데이터 모델 변경.
- 대규모 트래픽 캐시 전략의 실제 인프라 구현. 해당 내용은 문서 챕터로만 제공한다.

## 5. 요구사항

- `packages/ui`는 앱 루트의 `@/*` alias에 의존하지 않는다.
- 라이브러리 내부 컴포넌트 간 import는 패키지 내부 상대 경로를 사용한다.
- Radix, cmdk, cva, clsx, tailwind-merge 등 UI 런타임 의존성은 패키지가 직접 선언한다.
- Storybook은 개발/검증용, Docusaurus는 제출/배포용 문서로 역할을 나눈다.
- Docusaurus는 현재 로컬 Node 22에서 빌드 가능한 3.9.2 버전을 사용한다.
- npm 공개 배포 전 `@tcground/ui`는 `private: false`, public `publishConfig`, README, package metadata, `dist` 기준 JS/type/CSS export를 갖춘다.
- 실제 `npm publish` 이후 루트 `tcground` 앱은 `workspace:*`가 아니라 npm semver range로 배포본을 소비해 외부 설치 계약을 검증한다. 문서 사이트(`apps/docs`)는 로컬 패키지 문서/개발 검증을 위해 workspace dependency를 유지한다.

## 6. 변경 이력

- 2026-05-26: Headless UI 라이브러리 과제 PRD 생성.
- 2026-05-27: 기존 앱 공통 UI 컴포넌트의 라이브러리화로 방향 전환.
- 2026-05-28: npm 공개 배포 전 요구사항과 수동 publish 권한 확인 기준 추가.
- 2026-05-28: npm 공개 배포 후 루트 앱이 배포본을 소비하는 검증 기준 추가.
