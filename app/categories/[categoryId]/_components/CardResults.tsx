'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import type { PokemonCatalogCard, PokemonSort } from '@/lib/tcg-catalog';
import { loadPokemonCards } from '../_actions/load-cards';
import type { CardView } from '../_lib/category-search-params';
import { EmptyCardsState, GridCard, ListCard } from './CardResultCards';

export type { CardView };

// Grid columns per breakpoint, mirroring the Tailwind classes previously used
// (grid-cols-2 sm:grid-cols-3 lg:grid-cols-4). List view is always 1 column.
function gridColumnsForWidth(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 1) return items.map((item) => [item]);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

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

const CARD_RESULTS_STORAGE_PREFIX = 'tcground:category-results:v1:';
const CARD_RESULTS_STORAGE_TTL_MS = 30 * 60 * 1000;
export const CARD_RESULTS_RESTORE_MARKER_KEY = 'tcground:category-results:restore-key';

interface CardResultsStorageKeyInput {
  pathname: string;
  page: number;
  pageSize: number;
  sort: PokemonSort;
  query: string;
  rarities: string[];
  setSlugs: string[];
  view: CardView;
  totalCount: number;
}

interface SavedCardResultsState {
  items: PokemonCatalogCard[];
  loadedPage: number;
  scrollY: number;
  totalCount: number;
  pageSize: number;
  savedAt: number;
}

export function buildCardResultsStorageKey({
  pathname,
  page,
  pageSize,
  sort,
  query,
  rarities,
  setSlugs,
  view,
  totalCount,
}: CardResultsStorageKeyInput): string {
  return `${CARD_RESULTS_STORAGE_PREFIX}${JSON.stringify({
    pathname,
    page,
    pageSize,
    sort,
    query,
    rarities,
    setSlugs,
    view,
    totalCount,
  })}`;
}

export function markCardResultsForRestore(storageKey: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(CARD_RESULTS_RESTORE_MARKER_KEY, storageKey);
  } catch {
    // Storage can be unavailable in private browsing or full quota states.
  }
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
  const storageKey = useMemo(
    () =>
      buildCardResultsStorageKey({
        pathname,
        page,
        pageSize,
        sort,
        query,
        rarities,
        setSlugs,
        view,
        totalCount,
      }),
    [pathname, page, pageSize, query, rarities, setSlugs, sort, totalCount, view],
  );
  const [items, setItems] = useState<PokemonCatalogCard[]>(initialCards);
  const [loadedPage, setLoadedPage] = useState(page);
  const [loading, setLoading] = useState(false);
  // Start at the SSR-safe default (2) on both server and client so hydration
  // matches; the mount effect below syncs to the real viewport right after.
  // Reading window here would make the client's first render diverge from SSR.
  const [gridColumns, setGridColumns] = useState(2);
  const columns = view === 'list' ? 1 : gridColumns;
  const [listOffsetTop, setListOffsetTop] = useState(0);
  const [restoredStorageKey, setRestoredStorageKey] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  const loadedPageRef = useRef(loadedPage);

  // The server re-renders (and passes new initialCards) only when the URL
  // changes — i.e. desktop pagination, filters, sort, or search. In every such
  // case we replace the list rather than append. Adjusting state during render
  // (instead of in an effect) is React's recommended reset-on-prop-change pattern.
  const [prevInitialCards, setPrevInitialCards] = useState(initialCards);
  if (prevInitialCards !== initialCards) {
    setPrevInitialCards(initialCards);
    setItems(initialCards);
    setLoadedPage(page);
    setRestoredStorageKey(null);
  }

  const saveResultsState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const state: SavedCardResultsState = {
      items: itemsRef.current,
      loadedPage: loadedPageRef.current,
      scrollY: window.scrollY,
      totalCount,
      pageSize,
      savedAt: Date.now(),
    };

    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browsing or full quota states.
    }
  }, [pageSize, storageKey, totalCount]);

  const handleCardNavigate = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      saveResultsState();
      markCardResultsForRestore(storageKey);
    },
    [saveResultsState, storageKey],
  );

  useEffect(() => {
    itemsRef.current = items;
    loadedPageRef.current = loadedPage;
    if (restoredStorageKey !== storageKey) return;
    saveResultsState();
  }, [items, loadedPage, restoredStorageKey, saveResultsState, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePageHide = () => {
      saveResultsState();
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveResultsState]);

  useEffect(() => {
    if (typeof window === 'undefined' || restoredStorageKey === storageKey) return;

    let saved: SavedCardResultsState | null = null;
    let shouldRestore = false;
    try {
      shouldRestore = window.sessionStorage.getItem(CARD_RESULTS_RESTORE_MARKER_KEY) === storageKey;
      const raw = window.sessionStorage.getItem(storageKey);
      saved = raw ? (JSON.parse(raw) as SavedCardResultsState) : null;
    } catch {
      saved = null;
    }

    const restorableState =
      shouldRestore && isRestorableState(saved, { initialCards, page, pageSize, totalCount })
        ? saved
        : null;

    const restoreFrame = window.requestAnimationFrame(() => {
      try {
        if (shouldRestore) window.sessionStorage.removeItem(CARD_RESULTS_RESTORE_MARKER_KEY);
      } catch {
        // Ignore storage failures; restoration is best-effort.
      }

      if (restorableState) {
        itemsRef.current = restorableState.items;
        loadedPageRef.current = restorableState.loadedPage;
        setItems(restorableState.items);
        setLoadedPage(restorableState.loadedPage);

        window.requestAnimationFrame(() => {
          window.scrollTo({ top: restorableState.scrollY, behavior: 'auto' });
        });
      }
      setRestoredStorageKey(storageKey);
    });

    return () => window.cancelAnimationFrame(restoreFrame);
  }, [initialCards, page, pageSize, restoredStorageKey, storageKey, totalCount]);

  // Track the grid column count so virtual rows chunk correctly per breakpoint.
  // List view is always a single column. matchMedia is guarded so SSR / jsdom
  // (which lacks it) fall back to the initial column count.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const update = () => setGridColumns(gridColumnsForWidth(window.innerWidth));
    update(); // sync to the actual viewport once hydration is done
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const rows = useMemo(() => chunk(items, columns), [items, columns]);

  // The virtual list is absolutely positioned within `listRef`, which sits below
  // the page header. scrollMargin tells the virtualizer that document offset so
  // window scroll positions map to the right rows. Use getBoundingClientRect +
  // scrollY (not offsetTop) so a positioned ancestor can't skew the offset.
  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const measure = () => setListOffsetTop(node.getBoundingClientRect().top + window.scrollY);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [rows.length]);

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => (view === 'list' ? 160 : 340),
    overscan: 4,
    scrollMargin: listOffsetTop,
    getItemKey: (index) => rows[index]?.[0]?.href ?? index,
  });

  const hasMore = items.length < totalCount;

  const loadMore = useCallback(async () => {
    if (restoredStorageKey !== storageKey) return;

    setLoading(true);
    try {
      const nextPage = loadedPage + 1;
      const result = await loadPokemonCards({ query, rarities, setSlugs, sort, page: nextPage });
      setItems((current) => [...current, ...result.cards]);
      setLoadedPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, [loadedPage, query, rarities, restoredStorageKey, setSlugs, sort, storageKey]);

  useEffect(() => {
    if (!hasMore || loading || restoredStorageKey !== storageKey) return;
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
  }, [hasMore, loading, loadMore, restoredStorageKey, storageKey]);

  if (items.length === 0) {
    return <EmptyCardsState title='등록된 카드가 없습니다' />;
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const gap = 16; // matches the gap-4 spacing used before virtualization

  return (
    <section aria-labelledby='catalog-results-heading'>
      <h2 id='catalog-results-heading' className='sr-only'>
        등록 카드
      </h2>

      {/* Virtualized list: only the visible rows (+ overscan) are in the DOM.
          Rows are absolutely positioned inside a spacer sized to the full list. */}
      <div
        ref={listRef}
        className='relative w-full'
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        <ul>
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <li
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={view === 'list' ? 'flex flex-col gap-3' : 'grid gap-4'}
                style={{
                  gridTemplateColumns:
                    view === 'list' ? undefined : `repeat(${columns}, minmax(0, 1fr))`,
                  paddingBottom: gap,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                }}
              >
                {row.map((card) => (
                  <div key={card.href} className='flex'>
                    {view === 'list' ? (
                      <ListCard card={card} onNavigate={handleCardNavigate} />
                    ) : (
                      <GridCard card={card} onNavigate={handleCardNavigate} />
                    )}
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Infinite-scroll sentinel + status */}
      <div ref={sentinelRef} aria-hidden className='h-px w-full' />
      {loading ? (
        <p
          aria-live='polite'
          className='text-muted-foreground py-6 text-center text-sm font-semibold'
        >
          불러오는 중…
        </p>
      ) : null}
    </section>
  );
}

function isRestorableState(
  saved: SavedCardResultsState | null,
  context: {
    initialCards: PokemonCatalogCard[];
    page: number;
    pageSize: number;
    totalCount: number;
  },
): saved is SavedCardResultsState {
  if (!saved) return false;
  if (!Array.isArray(saved.items) || saved.items.length === 0) return false;
  if (saved.pageSize !== context.pageSize || saved.totalCount !== context.totalCount) return false;
  if (saved.loadedPage < context.page) return false;
  if (Date.now() - saved.savedAt > CARD_RESULTS_STORAGE_TTL_MS) return false;

  const firstInitialHref = context.initialCards[0]?.href;
  if (firstInitialHref && saved.items[0]?.href !== firstInitialHref) return false;

  return saved.items.length >= context.initialCards.length;
}
