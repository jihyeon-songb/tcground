---
slug: /
title: 소개
---

# Pokemon Headless UI

Pokemon Headless UI는 웹 접근성을 중심에 둔 React 컴포넌트 라이브러리입니다.
스타일을 강하게 고정하지 않고 동작, 상태, ARIA 속성, 키보드 조작을 우선 제공합니다.

## 목표

- Button, Dialog, Dropdown Menu, Tabs, Toggle 같은 기초 컴포넌트를 직접 구현합니다.
- `--pokemon-primary`, `--pokemon-secondary` 같은 CSS 변수로 테마를 바꿀 수 있게 합니다.
- Storybook으로 상태와 접근성을 검증하고, Docusaurus로 설치/사용법을 문서화합니다.
- Radix UI를 참고 대상으로 분석하되, 제품 코드는 Radix 래퍼로 만들지 않습니다.

## 산출물

<div class="docs-card-grid">
  <div class="docs-card">
    <strong>Library</strong>
    <p><code>packages/ui</code>에 React headless primitives를 제공합니다.</p>
  </div>
  <div class="docs-card">
    <strong>Storybook</strong>
    <p>컴포넌트 상태, 키보드 동작, a11y addon 확인에 사용합니다.</p>
  </div>
  <div class="docs-card">
    <strong>Docusaurus</strong>
    <p>설치, 테마, 접근성 가이드를 제출 가능한 문서로 정리합니다.</p>
  </div>
</div>
