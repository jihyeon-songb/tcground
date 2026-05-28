# @tcground/ui

Reusable React UI components extracted from TCGround.

## Install

```bash
npm install @tcground/ui
```

Install peer dependencies if your app does not already provide them:

```bash
npm install react react-dom
```

## Usage

Import the package stylesheet once in your app entrypoint.

```tsx
import '@tcground/ui/theme.css';
```

Then import components from the package root.

```tsx
import { Button } from '@tcground/ui';

export function SaveButton() {
  return <Button>Save changes</Button>;
}
```

## Styling

The components use CSS variables compatible with the TCGround/shadcn token contract. Importing `@tcground/ui/theme.css` provides the baseline tokens and fallback component styles.

Apps can override tokens such as `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--border`, `--ring`, and `--radius` in their own global CSS.

## Local Development

From the repository root:

```bash
pnpm build:ui
pnpm lint
pnpm exec tsc --noEmit
pnpm test --run
pnpm --filter @tcground/ui pack --dry-run
```

## Publish

The package is configured for public npm publishing.

```bash
npm login
cd packages/ui
npm publish --access public
```

The package name is scoped as `@tcground/ui`, so the publisher needs access to the `tcground` npm scope or organization.
