---
slug: /
title: 소개
---

# TCGround UI

TCGround UI는 기존 TCGround 앱 화면을 만들던 공통 UI 컴포넌트를 분리한 React 라이브러리입니다.
shadcn/Radix 기반 컴포넌트와 TCGround 디자인 토큰을 패키지로 묶어 앱, Storybook, 문서가 같은 UI 계약을 사용하게 합니다.

## 목표

- Button, Dialog, Dropdown Menu, Tabs, Switch 같은 앱 공통 UI 컴포넌트를 제공합니다.
- `--primary`, `--background`, `--ring` 같은 shadcn/Tailwind CSS 변수 계약으로 테마를 유지합니다.
- Storybook으로 상태와 접근성을 검증하고, Docusaurus로 설치/사용법을 문서화합니다.
- TCGround 도메인 컴포넌트는 앱에 남기고, 범용 UI만 패키지에 포함합니다.

## 산출물

<div class="docs-card-grid">
  <div class="docs-card">
    <strong>Library</strong>
    <p><code>packages/ui</code>에 재사용 가능한 공통 UI 컴포넌트를 제공합니다.</p>
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
