# @tcground/headless

Unstyled, accessible React UI primitives. These components ship behavior, ARIA
semantics, keyboard interaction, focus management, and `data-*` state hooks — but
no styling. Bring your own CSS (Tailwind, CSS Modules, vanilla CSS, anything that
targets the `data-slot` / `data-state` attributes).

`@tcground/ui` is the styled layer built on top of these primitives.

## Install

```bash
npm install @tcground/headless react react-dom
```

## Usage

The components render correct DOM, roles, and state attributes. You provide the
look via `className` (or `style`), which is forwarded to the underlying element.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@tcground/headless';

export function Example() {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="my-tablist">
        <TabsTrigger value="overview" className="my-tab">
          Overview
        </TabsTrigger>
        <TabsTrigger value="pricing" className="my-tab">
          Pricing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">…</TabsContent>
      <TabsContent value="pricing">…</TabsContent>
    </Tabs>
  );
}
```

Style against the exposed hooks, for example:

```css
[data-slot='tabs-trigger'][data-active] {
  font-weight: 600;
}
```

## Components

- `Button` — native button behavior, disabled semantics, `asChild` slot merging.
- `Label` — forwards focus to the associated control, prevents text selection on
  double-click.
- `Separator` — `role="separator"` / decorative, horizontal & vertical orientation.
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — roving tabindex, arrow / Home /
  End navigation, automatic & manual activation, controlled & uncontrolled.
- `Checkbox`, `CheckboxIndicator` — `role="checkbox"`, `aria-checked` (incl. `mixed`
  for indeterminate), Space toggle, controlled & uncontrolled.
- `Switch`, `SwitchThumb` — `role="switch"`, Space toggle, controlled & uncontrolled.
- `RadioGroup`, `RadioGroupItem`, `RadioGroupIndicator` — `role="radiogroup"` /
  `radio`, roving tabindex with arrow-key selection, controlled & uncontrolled.
- `Dialog`, `DialogTrigger`, `DialogClose`, `DialogPortal`, `DialogOverlay`,
  `DialogContent`, `DialogTitle`, `DialogDescription` — portal, focus trap, Escape
  to close, focus restore, `aria-modal` wiring, controlled & uncontrolled.
- `AlertDialog` (and `AlertDialog*` parts) — `Dialog` with `role="alertdialog"` that
  is not dismissed by overlay clicks (Escape still closes). `AlertDialogAction` /
  `AlertDialogCancel` close the dialog.
- `Sheet` (and `Sheet*` parts) — a `Dialog` rendered for edge-anchored panels; edge
  placement is a styling concern in the consumer.

State is exposed through boolean `data-*` hooks (`data-checked`, `data-unchecked`,
`data-disabled`, `data-horizontal`, `data-vertical`, `data-open`, …) so any CSS layer
can target them.

> Form participation: these controls are driven through their `on*Change` callbacks
> (and `checked` / `value` props). They do not render hidden inputs for native form
> submission — wire them to your form state directly.

Shared slot helpers `PrimitiveSlot`, `composeEventHandlers`, and `composeRefs`
are also exported for building your own primitives.
