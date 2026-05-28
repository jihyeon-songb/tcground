---
title: 테마 커스터마이징
---

# 테마 커스터마이징

기본 테마는 CSS 변수로 구성합니다. 사용자는 전역 또는 특정 컨테이너 단위로 값을 바꿀 수 있습니다.

```css
:root {
  --tcg-red: #bb001a;
  --tcg-red-dark: #930012;
  --primary: var(--tcg-red);
  --primary-foreground: #ffffff;
  --secondary: #e2e3e0;
  --secondary-foreground: #1a1c1b;
  --ring: var(--tcg-red);
  --radius: 1rem;
}
```

컴포넌트는 최소한의 클래스만 제공합니다.

```tsx
<div
  style={{
    '--tcg-red': '#0079b6',
    '--tcg-red-dark': '#005f90',
    '--primary': 'var(--tcg-red)',
    '--secondary': '#dcfce7',
  }}
>
  <Button>Blue primary</Button>
  <Button variant="secondary">Green secondary</Button>
</div>
```

스타일 원칙은 다음과 같습니다.

- 색상, focus ring, radius, surface는 토큰으로 바꿉니다.
- 컴포넌트별 추가 스타일은 `className`으로 확장합니다.
- disabled, selected, pressed 같은 상태는 ARIA와 data attribute를 함께 사용합니다.
