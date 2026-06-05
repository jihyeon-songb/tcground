'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PokemonCatalogCard, PokemonSort } from '@/lib/tcg-catalog';
import { loadPokemonCards } from '../_actions/load-cards';
import type { CardView } from '../_lib/category-search-params';
import { EmptyCardsState, GridCard, ListCard } from './CardResultCards';
import { Pagination } from './CardResultsPagination';

export type { CardView };

interface CardResultsProps {
  initialCards: PokemonCatalogCard[];
  totalCount: number;
  page: number;
  pageSize: number;
  sort: PokemonSort;
  query: string;
  rarities: string[];
  setSlugs: string[];
  view: CardView;
}

export function CardResults({
  initialCards,
  totalCount,
  page,
  pageSize,
  sort,
  query,
  rarities,
  setSlugs,
  view,
}: CardResultsProps) {
  const pathname = usePathname();
  const [items, setItems] = useState<PokemonCatalogCard[]>(initialCards);
  const [loadedPage, setLoadedPage] = useState(page);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // The server re-renders (and passes new initialCards) only when the URL
  // changes — i.e. desktop pagination, filters, sort, or search. In every such
  // case we replace the list rather than append. Adjusting state during render
  // (instead of in an effect) is React's recommended reset-on-prop-change pattern.
  const [prevInitialCards, setPrevInitialCards] = useState(initialCards);
  if (prevInitialCards !== initialCards) {
    setPrevInitialCards(initialCards);
    setItems(initialCards);
    setLoadedPage(page);
  }

  // Track viewport so infinite scroll is mobile-only; desktop uses pagination.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const hasMore = items.length < totalCount;

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const nextPage = loadedPage + 1;
      const result = await loadPokemonCards({ query, rarities, setSlugs, sort, page: nextPage });
      setItems((current) => [...current, ...result.cards]);
      setLoadedPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, [loadedPage, query, rarities, setSlugs, sort]);

  useEffect(() => {
    if (!isMobile || !hasMore || loading) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile, hasMore, loading, loadMore]);

  if (items.length === 0) {
    return <EmptyCardsState title='등록된 카드가 없습니다' />;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <section aria-labelledby='catalog-results-heading'>
      <h2 id='catalog-results-heading' className='sr-only'>
        등록 카드
      </h2>

      <ul
        className={
          view === 'list'
            ? 'flex flex-col gap-3'
            : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
        }
      >
        {items.map((card) => (
          <li key={card.href} className='flex'>
            {view === 'list' ? <ListCard card={card} /> : <GridCard card={card} />}
          </li>
        ))}
      </ul>

      {/* Mobile infinite-scroll sentinel + status */}
      <div className='md:hidden'>
        <div ref={sentinelRef} aria-hidden className='h-px w-full' />
        {loading ? (
          <p
            aria-live='polite'
            className='text-muted-foreground py-6 text-center text-sm font-semibold'
          >
            불러오는 중…
          </p>
        ) : null}
      </div>

      {/* Desktop pagination */}
      {totalPages > 1 ? (
        <Pagination
          pathname={pathname}
          currentPage={page}
          totalPages={totalPages}
          query={query}
          rarities={rarities}
          setSlugs={setSlugs}
          sort={sort}
          view={view}
        />
      ) : null}
    </section>
  );
}
