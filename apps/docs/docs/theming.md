---
title: 테마 커스터마이징
---

# 테마 커스터마이징

기본 테마는 CSS 변수로 구성합니다. 사용자는 전역 또는 특정 컨테이너 단위로 값을 바꿀 수 있습니다.

```css
:root {
  --pokemon-primary: #1f8f4d;
  --pokemon-primary-foreground: #ffffff;
  --pokemon-secondary: #b7e45a;
  --pokemon-secondary-foreground: #17321f;
  --pokemon-focus-ring: #f2c94c;
  --pokemon-radius: 0.5rem;
}
```

컴포넌트는 최소한의 클래스만 제공합니다.

```tsx
<div
  style={{
    '--pokemon-primary': '#2f6fff',
    '--pokemon-secondary': '#ffd84d',
  }}
>
  <Button>Water theme</Button>
  <Button variant="secondary">Electric theme</Button>
</div>
```

스타일 원칙은 다음과 같습니다.

- 색상, focus ring, radius, surface는 토큰으로 바꿉니다.
- 컴포넌트별 추가 스타일은 `className`으로 확장합니다.
- disabled, selected, pressed 같은 상태는 ARIA와 data attribute를 함께 사용합니다.
