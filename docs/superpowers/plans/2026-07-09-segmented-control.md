# SegmentedControl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `SegmentedControl` to `@tcground/ui` and replace the duplicated, mislabeled chart-period toggle in two chart components.

**Architecture:** Thin styled wrapper over the existing headless `RadioGroup`/`RadioGroupItem` primitives — keyboard nav, roving tabindex, and `aria-checked` come for free from headless. The current `role='tablist'` (with no tabpanels, no arrow-key nav) is corrected to `role='radiogroup'`. Composition API mirrors the library's `RadioGroup`/`Tabs`.

**Tech Stack:** React 19, `@tcground/headless` RadioGroup, Tailwind (`cn`), vitest + @testing-library/react, Storybook (`@storybook/nextjs-vite`).

## Global Constraints

- Library source imports use explicit `.js` extensions (e.g. `'../../utils.js'`). Match this.
- Components are `'use client'`.
- Tests: `@testing-library/react` + `vitest`, `cleanup()` in `afterEach`, Korean labels in fixtures (follow `button.test.tsx`).
- Single-run tests: `pnpm exec vitest run <path>` from repo root (root `pnpm test` is watch mode).
- Selected-state styling uses the `data-checked:` Tailwind variant (headless sets `data-checked` on the checked item).
- `onValueChange` gives a `string`; cast to the domain union (`v as ChartPeriod`) at the call site.

---

### Task 1: SegmentedControl component

**Files:**
- Create: `packages/ui/src/components/ui/segmented-control.tsx`
- Create: `packages/ui/src/components/ui/segmented-control.test.tsx`
- Create: `packages/ui/src/components/ui/segmented-control.stories.tsx`
- Modify: `packages/ui/src/index.ts` (add export line)

**Interfaces:**
- Consumes: `RadioGroup`, `RadioGroupItem`, `type RadioGroupProps` from `@tcground/headless`; `cn` from `../../utils.js`.
- Produces:
  - `SegmentedControl(props: RadioGroupProps)` — renders `div[role=radiogroup]`, controlled via `value` + `onValueChange(value: string)`, or uncontrolled via `defaultValue`.
  - `SegmentedControlItem(props: React.ComponentProps<typeof RadioGroupItem>)` — `value: string` required; children = label. Renders `button[role=radio]` with `aria-checked` and `data-checked`.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/ui/segmented-control.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';

describe('SegmentedControl', () => {
  afterEach(() => {
    cleanup();
  });

  function renderControl(onValueChange = vi.fn()) {
    render(
      <SegmentedControl defaultValue='3m' aria-label='차트 기간' onValueChange={onValueChange}>
        <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
        <SegmentedControlItem value='6m'>6개월</SegmentedControlItem>
        <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
      </SegmentedControl>,
    );
    return onValueChange;
  }

  it('exposes a radiogroup with the checked item reflected via aria-checked', () => {
    renderControl();

    expect(screen.getByRole('radiogroup', { name: '차트 기간' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '3개월' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '6개월' }).getAttribute('aria-checked')).toBe('false');
  });

  it('moves selection with the ArrowRight key', () => {
    const onValueChange = renderControl();
    const first = screen.getByRole('radio', { name: '3개월' });
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });

    expect(onValueChange).toHaveBeenCalledWith('6m');
    expect(screen.getByRole('radio', { name: '6개월' }).getAttribute('aria-checked')).toBe('true');
  });

  it('selects on click', () => {
    const onValueChange = renderControl();

    fireEvent.click(screen.getByRole('radio', { name: '1년' }));

    expect(onValueChange).toHaveBeenCalledWith('1y');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/ui/src/components/ui/segmented-control.test.tsx`
Expected: FAIL — cannot resolve `./segmented-control` (module not found).

- [ ] **Step 3: Write the component**

Create `packages/ui/src/components/ui/segmented-control.tsx`:

```tsx
'use client';

import * as React from 'react';
import { RadioGroup, RadioGroupItem, type RadioGroupProps } from '@tcground/headless';

import { cn } from '../../utils.js';

function SegmentedControl({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroup
      data-slot='segmented-control'
      className={cn('inline-flex items-center gap-1 rounded-full bg-muted p-1', className)}
      {...props}
    />
  );
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupItem>) {
  return (
    <RadioGroupItem
      data-slot='segmented-control-item'
      className={cn(
        'h-8 shrink-0 cursor-pointer rounded-full px-3 text-sm leading-none font-semibold',
        'whitespace-nowrap outline-none transition-colors',
        'text-muted-foreground hover:text-foreground',
        'data-checked:bg-card data-checked:text-foreground data-checked:shadow-xs',
        'focus-visible:ring-2 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}

export { SegmentedControl, SegmentedControlItem };
```

- [ ] **Step 4: Add the barrel export**

Modify `packages/ui/src/index.ts` — add, keeping the file's alphabetical-ish grouping (after `separator`, before `sheet` is fine):

```ts
export * from './components/ui/segmented-control.js';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/ui/src/components/ui/segmented-control.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Add the Storybook story**

Create `packages/ui/src/components/ui/segmented-control.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';

const meta = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const periods = (
  <>
    <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
    <SegmentedControlItem value='6m'>6개월</SegmentedControlItem>
    <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
    <SegmentedControlItem value='all'>전체</SegmentedControlItem>
  </>
);

export const Default: Story = {
  render: () => (
    <SegmentedControl defaultValue='6m' aria-label='차트 기간'>
      {periods}
    </SegmentedControl>
  ),
};

export const DisabledItem: Story = {
  render: () => (
    <SegmentedControl defaultValue='3m' aria-label='차트 기간'>
      <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
      <SegmentedControlItem value='6m' disabled>
        6개월
      </SegmentedControlItem>
      <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
    </SegmentedControl>
  ),
};
```

- [ ] **Step 7: Typecheck the package**

Run: `pnpm --filter @tcground/ui typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/components/ui/segmented-control.tsx \
        packages/ui/src/components/ui/segmented-control.test.tsx \
        packages/ui/src/components/ui/segmented-control.stories.tsx \
        packages/ui/src/index.ts
git commit -m "feat: @tcground/ui에 SegmentedControl 추가

- headless RadioGroup 위 스타일 래퍼, role=radiogroup + 화살표 키 내비
- 스토리·테스트(키보드 선택/aria-checked) 포함"
```

---

### Task 2: Rewire both chart period toggles

Replace the duplicated `role='tablist'` + Button loop in both charts with `SegmentedControl`. Both are identical in shape; do them together so the duplication is removed in one reviewable change.

**Files:**
- Modify: `app/cards/[cardId]/_components/PriceHistoryChart.tsx:82-111`
- Modify: `app/compare/_components/CompareView.tsx:64-93`

**Interfaces:**
- Consumes: `SegmentedControl`, `SegmentedControlItem` from `@tcground/ui` (Task 1). `CHART_PERIODS` (array of `{ value: ChartPeriod; label: string }`) and `ChartPeriod` already imported in both files.

- [ ] **Step 1: Rewire PriceHistoryChart**

In `app/cards/[cardId]/_components/PriceHistoryChart.tsx`, add to the existing `@tcground/ui` import (the `Button` import can be dropped if `Button` is no longer used elsewhere in the file — grep to confirm; it is only used in this toggle, so replace the import):

```tsx
import { SegmentedControl, SegmentedControlItem } from '@tcground/ui';
```

Replace the toggle block (lines 82-111, the `<div ... role='tablist' ...>` through its closing `</div>`) with:

```tsx
<SegmentedControl
  value={period}
  onValueChange={(value) => {
    setPeriod(value as ChartPeriod);
    setHoverIndex(null);
  }}
  aria-label='차트 기간'
>
  {CHART_PERIODS.map((option) => (
    <SegmentedControlItem key={option.value} value={option.value}>
      {option.label}
    </SegmentedControlItem>
  ))}
</SegmentedControl>
```

- [ ] **Step 2: Rewire CompareView**

In `app/compare/_components/CompareView.tsx`, replace the `Button` import from `@tcground/ui` with:

```tsx
import { SegmentedControl, SegmentedControlItem } from '@tcground/ui';
```

Replace the toggle block (lines 64-93) with:

```tsx
<SegmentedControl
  value={period}
  onValueChange={(value) => {
    setPeriod(value as ChartPeriod);
    setHoverX(null);
  }}
  aria-label='차트 기간'
>
  {CHART_PERIODS.map((option) => (
    <SegmentedControlItem key={option.value} value={option.value}>
      {option.label}
    </SegmentedControlItem>
  ))}
</SegmentedControl>
```

- [ ] **Step 3: Verify no dangling `Button` reference**

Run: `git grep -n "Button" app/cards/\[cardId\]/_components/PriceHistoryChart.tsx app/compare/_components/CompareView.tsx`
Expected: no matches (both files' only Button use was the toggle). If a match remains, keep `Button` in that file's import.

- [ ] **Step 4: Rebuild the UI package, then typecheck the app**

The app consumes `@tcground/ui` as a built package (workspace-linked `dist`; only `@tcground/headless` is source-aliased in `tsconfig.json`). The new export exists only after a rebuild.

Run: `pnpm --filter @tcground/ui build && npx tsc -p tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke check**

Run: `pnpm dev`, open a card detail page and `/compare?left=...&right=...`. Confirm: period toggle renders as before, click switches period, hover readout resets on switch, and Tab into the toggle + ArrowLeft/Right moves selection.

- [ ] **Step 6: Commit**

```bash
git add app/cards/\[cardId\]/_components/PriceHistoryChart.tsx \
        app/compare/_components/CompareView.tsx
git commit -m "refactor: 차트 기간 토글을 공용 SegmentedControl로 교체

- PriceHistoryChart·CompareView 중복 tablist 마크업 제거
- 잘못된 role=tablist → radiogroup, 화살표 키 내비 확보"
```

---

## Self-Review

- **Spec coverage:** component (Task 1), export (Task 1 Step 4), both rewires (Task 2), tablist→radiogroup + arrow-key a11y (Task 1 component + tests), Storybook + test (Task 1). YAGNI items (CardPicker, variants, data-driven API) intentionally excluded. ✅
- **Placeholder scan:** none — all steps carry full code/commands. ✅
- **Type consistency:** `SegmentedControl`/`SegmentedControlItem` names and `onValueChange(value: string)` signature consistent across Task 1 (produces) and Task 2 (consumes); `value as ChartPeriod` cast noted in Global Constraints and used at both call sites. ✅
- **Build resolution:** confirmed — app consumes `@tcground/ui` as workspace-linked `dist` (not source-aliased), so Task 2 Step 4 must rebuild the package before app typecheck. ✅
