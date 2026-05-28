---
title: 설치
---

# 설치

현재는 모노레포 내부 패키지로 개발합니다.

```bash
pnpm install
pnpm build:ui
```

앱이나 문서에서 CSS 토큰을 먼저 불러옵니다.

```tsx
import '@tcground/ui/theme.css';
import { Button } from '@tcground/ui';

export function Example() {
  return <Button>시작하기</Button>;
}
```

## 개발 명령어

```bash
pnpm storybook
pnpm build-storybook
pnpm docs
pnpm build:docs
```
