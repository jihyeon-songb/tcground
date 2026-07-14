import type { PokemonSort } from '@/lib/tcg-catalog';

export type CardView = 'grid' | 'list';

/** The fully-resolved filter state for the category card list. */
export interface CategoryFilters {
  query: string;
  rarities: string[];
  setSlugs: string[];
  sort: PokemonSort;
  page: number;
  view: CardView;
}

/** Raw `searchParams` shape as delivered to the category route. */
export interface CategorySearchParams {
  q?: string | string[];
  rarity?: string | string[];
  set?: string | string[];
  sort?: string | string[];
  page?: string | string[];
  view?: string | string[];
}

export function parseListParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(',') : value;
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseSortParam(value: string | string[] | undefined): PokemonSort {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'name-asc' || raw === 'name-desc' || raw === 'price-desc') return raw;
  return 'best';
}

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseViewParam(value: string | string[] | undefined): CardView {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'list' ? 'list' : 'grid';
}

/** Resolves the raw route `searchParams` into a normalized {@link CategoryFilters}. */
export function parseCategoryFilters(searchParams: CategorySearchParams): CategoryFilters {
  return {
    query: (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? '').trim(),
    rarities: parseListParam(searchParams.rarity),
    setSlugs: parseListParam(searchParams.set),
    sort: parseSortParam(searchParams.sort),
    page: parsePageParam(searchParams.page),
    view: parseViewParam(searchParams.view),
  };
}

/**
 * Canonical serialization of the filter state. Default values are omitted so
 * URLs stay clean and deep links remain stable — this is the single source of
 * truth shared by the page, pagination, and toolbar controls.
 */
export function categoryFiltersToSearchParams(filters: CategoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.rarities.length > 0) params.set('rarity', filters.rarities.join(','));
  if (filters.setSlugs.length > 0) params.set('set', filters.setSlugs.join(','));
  if (filters.sort !== 'best') params.set('sort', filters.sort);
  if (filters.view === 'list') params.set('view', 'list');
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/** Builds an href for the given base path and filter state. */
export function buildCategoryHref(base: string, filters: CategoryFilters): string {
  const query = categoryFiltersToSearchParams(filters).toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Appends already-built params to a path. Used by the interactive controls
 * that mutate the live `URLSearchParams` in place (toggling a single key)
 * rather than rebuilding from a {@link CategoryFilters}.
 */
export function appendQuery(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
