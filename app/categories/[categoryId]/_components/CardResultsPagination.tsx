import Link from 'next/link';
import type { PokemonSort } from '@/lib/tcg-catalog';
import { buildCategoryHref, type CardView } from '../_lib/category-search-params';

export function Pagination({
  pathname,
  currentPage,
  totalPages,
  query,
  rarities,
  setSlugs,
  sort,
  view,
}: {
  pathname: string;
  currentPage: number;
  totalPages: number;
  query: string;
  rarities: string[];
  setSlugs: string[];
  sort: PokemonSort;
  view: CardView;
}) {
  const buildHref = (targetPage: number) =>
    buildCategoryHref(pathname, { query, rarities, setSlugs, sort, page: targetPage, view });

  const pages = pageWindow(currentPage, totalPages);

  return (
    <nav
      aria-label='페이지네이션'
      className='mt-8 hidden items-center justify-center gap-1 md:flex'
    >
      <PageLink
        href={buildHref(currentPage - 1)}
        disabled={currentPage <= 1}
        ariaLabel='이전 페이지'
      >
        ‹
      </PageLink>
      {pages.map((p) => (
        <PageLink key={p} href={buildHref(p)} active={p === currentPage} ariaLabel={`${p} 페이지`}>
          {p}
        </PageLink>
      ))}
      <PageLink
        href={buildHref(currentPage + 1)}
        disabled={currentPage >= totalPages}
        ariaLabel='다음 페이지'
      >
        ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active = false,
  disabled = false,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const base =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors';

  if (disabled) {
    return (
      <span
        aria-disabled='true'
        className={`${base} border-border text-muted-foreground cursor-not-allowed`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      scroll
      className={`${base} ${
        active
          ? 'border-tcg-red bg-tcg-red text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-foreground'
      }`}
    >
      {children}
    </Link>
  );
}

function pageWindow(current: number, total: number): number[] {
  const windowSize = 5;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  const end = Math.min(total, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const result: number[] = [];
  for (let p = start; p <= end; p += 1) result.push(p);
  return result;
}
