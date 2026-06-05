import Link from 'next/link';

interface CategoryTabsProps {
  /** Href of the active Products tab (keeps the current filters/query). */
  productsHref: string;
}

const TABS = [
  { key: 'products', label: 'Products' },
  { key: 'articles', label: 'Articles' },
  { key: 'decks', label: 'Decks' },
] as const;

/**
 * TCGplayer-style top tab strip. Only Products is wired up; Articles/Decks have
 * no destination yet so they render as disabled placeholders.
 */
export function CategoryTabs({ productsHref }: CategoryTabsProps) {
  return (
    <nav
      aria-label='카탈로그 보기'
      className='mb-6 flex items-center gap-6 border-b border-border'
    >
      {TABS.map((tab) => {
        const isActive = tab.key === 'products';

        if (isActive) {
          return (
            <Link
              key={tab.key}
              href={productsHref}
              aria-current='page'
              className='-mb-px border-b-2 border-tcg-red px-1 pb-3 text-base font-bold text-foreground'
            >
              {tab.label}
            </Link>
          );
        }

        return (
          <span
            key={tab.key}
            aria-disabled='true'
            className='-mb-px cursor-not-allowed border-b-2 border-transparent px-1 pb-3 text-base font-semibold text-muted-foreground'
          >
            {tab.label}
          </span>
        );
      })}
    </nav>
  );
}
