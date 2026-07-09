# SegmentedControl 공용 컴포넌트 설계

**날짜**: 2026-07-09
**범위**: `@tcground/ui`에 `SegmentedControl` 추가, 중복된 "기간 토글" 두 곳을 교체

## 배경

차트 기간 토글(3M / 6M / 1Y …)이 두 컴포넌트에 그대로 복붙되어 있다.

- `app/cards/[cardId]/_components/PriceHistoryChart.tsx:82-111`
- `app/compare/_components/CompareView.tsx:64-93`

두 곳 모두 동일한 마크업:

```
div.flex.items-center.gap-1.rounded-full.bg-muted.p-1
  role='tablist' aria-label='차트 기간'
  → CHART_PERIODS.map(Button variant/size='tab' role='tab' aria-selected + active-class)
```

### 접근성 문제

현재 패턴은 `role='tablist'` / `role='tab'`로 라벨되어 있으나:

- **tabpanel이 없다.** 탭을 눌러도 패널을 전환하는 게 아니라 같은 차트를 제자리에서 필터한다. WAI-ARIA tabs 패턴은 각 tab이 `aria-controls`로 tabpanel을 가리켜야 하는데 그 대상이 없다.
- **키보드 화살표 이동이 없다.** 진짜 tablist는 화살표 키로 탭 간 이동 + roving tabindex가 필요한데, 여기선 각 Button이 개별 탭 스톱이고 화살표 키는 아무 동작 안 한다.

"값 하나를 골라 같은 뷰를 재구성"하는 UI의 올바른 시맨틱은 **radiogroup**이다. 따라서 신규 컴포넌트는 `role='tablist'`를 `role='radiogroup'`으로 교정한다.

## 접근법

라이브러리는 자체 headless 프리미티브 `@tcground/headless` 위에 세워져 있다. `RadioGroup` / `RadioGroupItem`이 이미 존재하며 다음을 내장한다 (`packages/headless/src/radio-group.tsx`):

- `<button role='radio'>` 렌더 + 임의 children 통과
- `aria-checked`, roving tabindex (`tabIndex` 계산)
- 화살표 키 ←→↑↓ 이동+선택, Space 선택
- `data-checked` / `data-unchecked` 스타일 훅

**선택: headless `RadioGroup` 위 스타일 래퍼** (키보드/포커스/a11y 로직 0줄). 기각한 대안:

- `div role=radiogroup` 손수 구현 — 키보드 로직 재발명. 불필요.
- headless `Tabs` 재사용 — tabpanel 강제. 패널이 없으므로 부적합.

## API

라이브러리의 `RadioGroup`/`Tabs`와 일관되게 **합성 패턴**.

```tsx
<SegmentedControl value={period} onValueChange={setPeriod} aria-label='차트 기간'>
  {CHART_PERIODS.map((o) => (
    <SegmentedControlItem key={o.value} value={o.value}>
      {o.label}
    </SegmentedControlItem>
  ))}
</SegmentedControl>
```

- `SegmentedControl` — `RadioGroupProps` 통과 (controlled `value` + `onValueChange`, 또는 uncontrolled `defaultValue`). `aria-label` 권장 (radiogroup 이름).
- `SegmentedControlItem` — `RadioGroupItem` props (`value` 필수), children = 라벨.

## 구현

**파일**: `packages/ui/src/components/ui/segmented-control.tsx`

```tsx
'use client';
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

function SegmentedControlItem({ className, ...props }: React.ComponentProps<typeof RadioGroupItem>) {
  return (
    <RadioGroupItem
      data-slot='segmented-control-item'
      className={cn(
        'h-8 shrink-0 cursor-pointer rounded-full px-3 text-sm leading-none font-semibold',
        'transition-colors outline-none whitespace-nowrap',
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

pill 지오메트리는 `buttonVariants` `size='tab'`(`h-8 rounded-full px-3 text-sm leading-none shadow-none`)에서 차용, 선택 상태는 `data-checked` 훅으로 표현 (기존 active-class `bg-card text-foreground` 유지).

**Export**: `packages/ui/src/index.ts`에 `export * from './components/ui/segmented-control.js';` 추가.

## 리와이어

두 소비처의 `role=tablist` div + Button 루프를 교체한다.

- `PriceHistoryChart.tsx:82-111` → `<SegmentedControl value={period} onValueChange={(v) => { setPeriod(v); setHoverIndex(null); }} aria-label='차트 기간'>` + `SegmentedControlItem` 매핑.
- `CompareView.tsx:64-93` → 동일 패턴, `setHoverX(null)` 리셋 유지.

`onValueChange`는 `(value: string)`을 넘기므로 `setPeriod(v as ChartPeriod)` 캐스팅 필요 (CHART_PERIODS 값이 곧 유니온).

## 검증

- **Storybook**: `segmented-control.stories.tsx` — 기본(3옵션), 다크모드, disabled item.
- **테스트**: `segmented-control.test.tsx` — 래퍼 스모크 1개. 렌더 후 첫 아이템 포커스 → `ArrowRight`로 다음 값 선택되고 `aria-checked` 이동 확인. (키보드 로직 본체는 headless 테스트가 이미 커버; 래퍼가 role/속성 통과하는지만 확인.)
- 기존 두 차트의 시각/동작 회귀 없음 확인 (수동).

## 범위 밖 (YAGNI)

- CardPicker 승격 — 별도 작업.
- 방향(vertical) / 크기 variant — 소비처가 단일 크기. 필요해지면 추가.
- `options` 배열 데이터-드리븐 API — 합성으로 충분.
