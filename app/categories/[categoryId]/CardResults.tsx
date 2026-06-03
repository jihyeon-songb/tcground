'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PokemonCatalogCard, PokemonSort, PriceDisplay } from '@/lib/tcg-catalog';
import { formatPrice } from '@/lib/tcg-data';
import { loadPokemonCards } from './_actions/load-cards';

export type CardView = 'grid' | 'list';

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
          <p aria-live='polite' className='py-6 text-center text-sm font-semibold text-[#535f73]'>
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

function GridCard({ card }: { card: PokemonCatalogCard }) {
  return (
    <Link
      href={card.href}
      aria-label={`${card.name} 상세 보기`}
      className='group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[#e0e3e5] bg-white shadow-sm transition-all duration-200 hover:shadow-md'
    >
      <CardImage card={card} />
      <div className='flex flex-1 flex-col gap-1 p-4'>
        <h3 className='line-clamp-2 text-base leading-tight font-bold text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
          {card.name}
        </h3>
        <p className='line-clamp-1 text-sm font-medium text-[#535f73]'>
          {card.setName} · {card.rarity} · {card.collectorNumber}
        </p>
        <div className='mt-auto pt-3'>
          <PriceSummary price={card.price} />
        </div>
      </div>
    </Link>
  );
}

/** Renders the price summary, or a "시세 정보 없음" placeholder when there is none. */
function PriceSummary({ price }: { price: PriceDisplay | null }) {
  if (!price) {
    return <p className='text-sm font-semibold text-[#9aa5b1]'>시세 정보 없음</p>;
  }

  return (
    <>
      <p className='text-xs font-semibold tracking-wide text-[#535f73]'>
        {price.sampleCount > 0 ? `${price.sampleCount}건 등록 · 최저` : '시세 기준'}
      </p>
      <p className='text-xl leading-none font-bold text-[#191c1e] tabular-nums'>
        {formatPrice(price.minPrice, price.currency)}
      </p>
      <p className='mt-1 text-sm font-bold text-[#166534] tabular-nums'>
        시세 {formatPrice(price.avgPrice, price.currency)}
      </p>
    </>
  );
}

function CardImage({ card }: { card: PokemonCatalogCard }) {
  if (card.imageUrl) {
    return (
      <div className='relative aspect-[2.5/3.5] w-full overflow-hidden bg-[#eceef0]'>
        <Image
          alt={`${card.name} 카드`}
          src={card.imageUrl}
          fill
          sizes='(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'
          className='object-contain'
        />
      </div>
    );
  }

  return (
    <div className='flex aspect-[2.5/3.5] w-full flex-col justify-between bg-[#eceef0] p-4'>
      <div className='flex items-center justify-between gap-2'>
        <span className='rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#535f73]'>
          {card.sampleId}
        </span>
        <span className='rounded-full bg-[#bb001a] px-2 py-0.5 text-[10px] font-bold text-white'>
          {card.rarity}
        </span>
      </div>
      <div>
        <p className='line-clamp-2 text-lg leading-tight font-extrabold text-[#191c1e]'>
          {card.name}
        </p>
        <p className='mt-1 text-xs font-semibold text-[#535f73]'>{card.collectorNumber}</p>
      </div>
    </div>
  );
}

function ListCard({ card }: { card: PokemonCatalogCard }) {
  return (
    <Link
      href={card.href}
      aria-label={`${card.name} 상세 보기`}
      className='group flex w-full gap-4 rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md'
    >
      <ListImage card={card} />
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <h3 className='line-clamp-2 text-base leading-tight font-bold text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
          {card.name}
        </h3>
        <p className='text-sm font-medium text-[#535f73]'>
          {card.setName} · {card.rarity} · {card.collectorNumber}
        </p>
        <div className='mt-auto pt-2'>
          <PriceSummary price={card.price} />
        </div>
      </div>
    </Link>
  );
}

function ListImage({ card }: { card: PokemonCatalogCard }) {
  if (card.imageUrl) {
    return (
      <div className='relative aspect-[2.5/3.5] w-24 shrink-0 overflow-hidden rounded-lg bg-[#eceef0] sm:w-28'>
        <Image
          alt={`${card.name} 카드`}
          src={card.imageUrl}
          fill
          sizes='112px'
          className='object-contain'
        />
      </div>
    );
  }

  return (
    <div className='flex aspect-[2.5/3.5] w-24 shrink-0 flex-col justify-between rounded-lg bg-[#eceef0] p-2 sm:w-28'>
      <span className='self-start rounded-full bg-[#bb001a] px-2 py-0.5 text-[10px] font-bold text-white'>
        {card.rarity}
      </span>
      <span className='text-[10px] font-semibold text-[#535f73]'>{card.collectorNumber}</span>
    </div>
  );
}

function Pagination({
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
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (rarities.length > 0) params.set('rarity', rarities.join(','));
    if (setSlugs.length > 0) params.set('set', setSlugs.join(','));
    if (sort !== 'best') params.set('sort', sort);
    if (view === 'list') params.set('view', 'list');
    if (targetPage > 1) params.set('page', String(targetPage));
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

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
        <PageLink
          key={p}
          href={buildHref(p)}
          active={p === currentPage}
          ariaLabel={`${p} 페이지`}
        >
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
        className={`${base} cursor-not-allowed border-[#e0e3e5] text-[#c2c8cd]`}
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
          ? 'border-[#bb001a] bg-[#bb001a] text-white'
          : 'border-[#cdd2d6] bg-white text-[#191c1e] hover:border-[#191c1e]'
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

function EmptyCardsState({ title }: { title: string }) {
  return (
    <section
      aria-live='polite'
      className='flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-6 py-16 text-center'
    >
      <h3 className='text-2xl leading-tight font-bold text-[#191c1e]'>{title}</h3>
      <p className='max-w-md text-base leading-[1.5] text-[#535f73]'>
        다른 카테고리를 둘러보거나 검색어로 카드를 찾아보세요.
      </p>
    </section>
  );
}
