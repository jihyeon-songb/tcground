---
title: 접근성 설계 원칙
---

# 접근성 설계 원칙

접근성은 문서에만 적는 체크리스트가 아니라 컴포넌트 API의 일부입니다.

## 공통 원칙

- 키보드만으로 열기, 이동, 선택, 닫기가 가능해야 합니다.
- 시각적 focus ring은 제거하지 않고 테마 토큰으로 관리합니다.
- 상태는 `aria-expanded`, `aria-selected`, `aria-pressed`, `aria-modal`처럼 보조 기술이 이해할 수 있는 속성으로 노출합니다.
- uncontrolled와 controlled 상태를 모두 지원해 앱 요구사항에 맞게 상태를 소유할 수 있게 합니다.

## 컴포넌트별 기준

- Dialog: `role="dialog"`, `aria-modal`, focus trap, Escape close, focus restore.
- Dropdown Menu: trigger의 `aria-haspopup`, `aria-expanded`, menu/menuitem role, 방향키 이동.
- Tabs: tablist/tab/tabpanel role, `aria-selected`, 방향키 이동.
- Toggle: `aria-pressed`로 pressed state 노출.
- Button: native button 기본값과 disabled state 보존, `asChild` 사용 시 `aria-disabled` 보강.
