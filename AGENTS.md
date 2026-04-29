## Project

- This is a Next.js App Router project.
- Use TypeScript.
- Use pnpm as the package manager.
- Use Tailwind CSS for styling.
- Prefer Server Components by default.
- Use Client Components only when interactivity, browser APIs, or React hooks are required.

## Product Direction

- This project is a TCG price tracking and community service.
- Design for future expansion into secondhand trading and auctions.
- Keep user-facing flows practical, searchable, and scalable.
- Prioritize clear data models, server-side validation, and SEO-friendly pages.

## Commands

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Check formatting: `pnpm format:check`

## Formatting

- Use Prettier with the project `.prettierrc`.
- Use `prettier-plugin-tailwindcss` for Tailwind class sorting.
- Use single quotes.
- Use semicolons.
- Use 2 spaces for indentation.
- Keep line width around 100 characters.
- Run `pnpm format` after broad code changes.

## Coding Rules

- Make small, focused changes.
- Follow the existing file structure and naming conventions.
- Do not add a new UI library unless explicitly requested.
- Do not add unnecessary abstractions.
- Do not change lockfiles unless dependencies are added, removed, or updated.
- Do not commit secrets or hard-code API keys.
- Use environment variables for credentials and service configuration.

## Next.js Rules

- Use App Router patterns.
- Prefer route handlers for server APIs.
- Validate all user input on the server.
- Keep database writes on the server.
- Use metadata for SEO-relevant pages.
- Avoid putting sensitive logic in Client Components.

## UI Rules

- Use Tailwind CSS.
- Keep layouts responsive from mobile to desktop.
- Use accessible buttons, labels, forms, and focus states.
- Avoid oversized marketing-style sections for app screens.
- Build the actual usable product screen first, not a landing page, unless requested.

## Data And Infrastructure

- Planned stack:
  - Vercel for hosting
  - Supabase Postgres for database
  - Supabase Auth or Clerk for authentication
  - Supabase Storage or Cloudflare R2 for images
  - Upstash Redis for caching, rate limiting, and queues
  - Resend for email

## Verification

- Before finishing code changes, run `pnpm lint` when available.
- For larger changes, run `pnpm build`.
- If formatting changes are broad, run `pnpm format:check`.
- If a command fails, explain what failed and why.
