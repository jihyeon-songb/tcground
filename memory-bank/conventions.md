# CONVENTIONS

> 명명 규칙·코딩 스타일·테스트·커밋 컨벤션.
> 자동 포맷되는 항목(들여쓰기·세미콜론·따옴표·줄 길이)은 `.prettierrc`가 강제하므로 여기에 적지 않는다.
> 마지막 갱신: 2026-05-06

## 1. 명명 규칙

- 디렉터리: `kebab-case`.
- React 컴포넌트 파일: `PascalCase.tsx` (예: `UserProfileCard.tsx`).
- 커스텀 훅: `use*` + camelCase (예: `useAuth.ts`).
- 유틸리티·헬퍼: camelCase (예: `formatDate.ts`).
- 전용 타입 파일: `*.types.ts`.
- 변수·함수: camelCase. 상수: `UPPER_SNAKE_CASE`. 타입·인터페이스: PascalCase.
- 불리언은 가독성에 도움될 때 `is/has/can` 접두사 (예: `isLoading`, `hasError`).
- 이벤트 핸들러는 `handle*` (예: `handleClick`). prop으로 전달하는 콜백은 `on*` (예: `onSubmit`).
- 인터페이스에 `I` 접두사 금지.
- 한글 식별자(변수·함수·파일명) 금지.

## 2. 코딩 룰

- TypeScript: `any` 금지. 불가피하면 `// eslint-disable-next-line` + 사유 주석.
- 객체 형태 타입은 `interface`, 유니온·인터섹션은 `type` alias.
- 클래스 컴포넌트 금지. 함수형 + hooks만.
- 작고 집중된 변경. 불필요한 추상화 금지.
- 명시적 요청 없이 새 라이브러리 추가 금지.
- 시크릿·API 키 하드코딩 금지. 인증 정보·서비스 설정은 환경 변수.
- 주석은 비자명한 동작에만. export·재사용·복잡한 함수에는 간결한 JSDoc 권장.
- 변수가 포함된 문자열은 템플릿 리터럴 사용.

## 3. 테스트

- 도구: Vitest + Testing Library + jsdom (`vitest.config.mts`).
- 위치: 파일과 같은 디렉터리에 co-locate. 컴포넌트는 `Foo.test.tsx`, 유틸은 `foo.test.ts`.
- 새 기능 추가 시 핵심 동작에 대한 단위 테스트를 동반한다.
- 버그 수정 시 회귀 테스트를 추가한다.
- 외부 의존(네트워크·DB)은 모킹한다. 실제 외부 호출 금지.
- 실행: `pnpm test` (감시), `pnpm test --run` (1회).

## 4. 커밋 컨벤션

Udacity Git Commit Message Style Guide. 형식: `type: subject`.

타입:
- `feat`: 새 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 동작 변경 없는 포맷·스타일
- `refactor`: 리팩토링
- `test`: 테스트 추가·리팩토링
- `chore`: 빌드·도구·잡일
- `init`: 초기 프로젝트 생성

규칙:
- 제목 50자 이하 권장. 마침표 금지. 영어는 동사 원형 + 첫 글자 대문자.
- 한국어를 기본으로 사용한다. 영어는 필요할 때만.
- 제목과 본문 사이 빈 줄. 본문 한 줄 72자 안팎. 한 줄에 한 가지 변경.
- 본문에는 **무엇을·왜** 바꿨는지 적는다.
- 본문은 불릿 포인트로 간략하게 적는다.
- 푸터: `Resolves: #12`, `Fixes: #12`, `Ref: #12`, `Related to: #12`.

## 5. 변경 이력

- 2026-05-06: 초기 CONVENTIONS 정리.
