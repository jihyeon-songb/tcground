import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';
import { isAskingSource } from './pricing/price-source.types';
import { toSnapshotDate } from './pricing/aggregate';
import {
  buildBrowseKeyword,
  buildEbaySearchPageUrl,
  type BrowseCardQuery,
} from './pricing/ebay/browse-adapter';

type ChangeTone = 'up' | 'down' | 'flat';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Cache tags + revalidation window for public catalog reads. The price cron runs
 * once a day (see `vercel.json`), so an hour-long window keeps navigation fast
 * while staying well within freshness needs. `revalidateTag(PRICES_CACHE_TAG)`
 * from the cron route refreshes everything immediately after collection.
 */
export const CATALOG_CACHE_TAG = 'catalog';
export const PRICES_CACHE_TAG = 'prices';
const CATALOG_REVALIDATE_SECONDS = 3600;

export type CardEdition = 'kr' | 'jp' | 'na';

interface SupabaseErrorLike {
  message: string;
}

export interface TcgGameRow {
  id: string;
  slug: string;
  name: string;
  name_ko: string | null;
  description: string | null;
}

export interface CardSetRow {
  slug: string;
  name: string;
  name_ko: string | null;
}

export interface TcgCategoryOverviewGameRow {
  id: string;
  slug: string;
  name: string;
  name_ko: string | null;
  description: string | null;
}

export interface TcgCategoryOverview {
  slug: string;
  name: string;
  description: string;
  href: string;
  cardCount: number;
  setCount: number;
  priceSnapshotCount: number;
  status: 'live' | 'catalog-only' | 'empty';
  statusLabel: string;
}

const DEFAULT_TCG_CATEGORY_BASE = [
  {
    slug: 'pokemon',
    name: '포켓몬 카드',
    description: '한국판 포켓몬 대표 카드와 가격 기록을 추적합니다.',
  },
  {
    slug: 'yugioh',
    name: '유희왕',
    description: '유희왕 카드 카탈로그와 가격 추적 데이터를 준비 중입니다.',
  },
  {
    slug: 'one-piece',
    name: '원피스',
    description: '원피스 리더 카드와 주요 수입판 카탈로그를 준비 중입니다.',
  },
  {
    slug: 'magic',
    name: '매직 더 개더링',
    description: '매직 더 개더링 staples와 세트별 카탈로그를 준비 중입니다.',
  },
] as const;

export interface CardPrintingRow {
  id: string;
  language: string;
  region: string;
  set_name: string;
  set_code: string;
  collector_number: string;
  rarity: string | null;
  finish: string;
  image_url: string | null;
  external_ids: Record<string, unknown> | null;
}

export interface PokemonCatalogCardRow {
  id: string;
  slug: string;
  name: string;
  collector_number: string | null;
  rarity: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  card_sets: CardSetRow | null;
  card_printings: CardPrintingRow[];
}

export interface CardDetailRow extends PokemonCatalogCardRow {
  tcg_games: {
    slug: string;
    name: string;
    name_ko: string | null;
  } | null;
}

export interface PriceDisplay {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  changeRate: number;
  changeTone: ChangeTone;
  lastUpdatedAt: string;
  /** 마지막 실측 스냅샷 이후 경과 일수. 0 = 오늘 데이터. */
  stalenessDays: number;
  sourceLabel: string;
  currency: string;
  sampleCount: number;
  /** Link to the cheapest listing behind this price (eBay listing or search URL). */
  sourceUrl?: string | null;
  sourceCurrency?: string | null;
  fxRateDate?: string | null;
  fxProvider?: string | null;
}

/** A single dated price point for the detail chart. */
export interface PricePoint {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sampleCount: number;
  currency: string;
  sourceNames: string[];
  /** Link to the cheapest listing in this point's group (eBay listing or search URL). */
  sourceUrl?: string | null;
  sourceCurrency?: string | null;
  fxRateDate?: string | null;
  fxProvider?: string | null;
}

/**
 * Price history for the detail chart. `askingSeries` is the daily marketplace
 * asking trend; `soldPoints` are aggregated sold observations overlaid as
 * reference points. `gradeLabel` names the grade of the trend series when it is
 * a graded fallback, and is null when the trend is raw.
 */
export interface PriceHistory {
  askingSeries: PricePoint[];
  soldPoints: PricePoint[];
  currency: string | null;
  gradeLabel: string | null;
  hasData: boolean;
}

export interface CardPriceSnapshotRow {
  snapshot_date: string;
  market: string;
  currency: string;
  source_currency?: string | null;
  source_avg_price?: number | null;
  source_min_price?: number | null;
  source_max_price?: number | null;
  display_currency?: string | null;
  display_avg_price?: number | null;
  display_min_price?: number | null;
  display_max_price?: number | null;
  fx_rate?: number | null;
  fx_rate_date?: string | null;
  fx_provider?: string | null;
  variant: string;
  source_name: string;
  source_url?: string | null;
  aggregation_method?: string | null;
  condition_label?: string | null;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  sample_count: number | null;
  grade_company?: string | null;
  grade_value?: string | null;
  listings?: Array<{ price: number; currency: string; url: string; title: string | null }> | null;
}

export interface PokemonCatalogCard {
  slug: string;
  name: string;
  href: string;
  setName: string;
  setSlug: string;
  rarity: string;
  collectorNumber: string;
  sampleId: string;
  imageUrl: string | null;
  /** Real snapshot-derived price summary, or null when the card has no price data. */
  price: PriceDisplay | null;
  /** Number of price-snapshot records backing this card; drives the recommended ("추천순") order. */
  priceSnapshotCount: number;
}

export interface AvailableSetOption {
  slug: string;
  name: string;
}

export type PokemonSort = 'best' | 'name-asc' | 'name-desc';

export const DEFAULT_POKEMON_PAGE_SIZE = 24;
const SNAPSHOT_FETCH_CHUNK_SIZE = 100;
const RECOMMENDED_CANDIDATE_FETCH_LIMIT = 5000;

export interface PokemonCategoryPageData {
  gameName: string;
  gameNameKo: string;
  description: string;
  availableSets: AvailableSetOption[];
  availableRarities: string[];
  selectedRarities: string[];
  selectedSetSlugs: string[];
  cards: PokemonCatalogCard[];
  query: string;
  totalCount: number;
  page: number;
  pageSize: number;
  sort: PokemonSort;
}

/** An individual eBay active listing, KRW-converted, for the detail page link list. */
export interface EbayListing {
  priceKrw: number;
  url: string;
  title: string | null;
}

export interface MarketplaceFallbackLink {
  kind: 'source' | 'search';
  href: string;
  sourceLabel: string;
  actionLabel: string;
}

/** Public aggregate of user ratings for a card. */
export interface CardRatingSummary {
  /** Average score (1–5, one decimal), or null when there are no ratings. */
  average: number | null;
  count: number;
}

export interface CatalogCardDetail {
  cardId: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  chips: string[];
  cardName: string;
  setLabel: string;
  collectorNumber: string;
  rarity: string;
  imageUrl: string | null;
  price: PriceDisplay;
  selectedEdition: CardEdition;
  editionOptions: CardEditionOption[];
  printing: {
    id: string;
    language: string;
    region: string;
    setCode: string;
    collectorNumber: string;
    finish: string;
    sampleId: string;
    nameEn: string | null;
    nameJa: string | null;
  };
  priceHistory: PriceHistory;
  /** Individual eBay 판매중 listings (price asc, KRW), empty when none available. */
  ebayListings: EbayListing[];
  /** Index into `ebayListings` of the listing closest to the average price; -1 when empty. */
  featuredListingIndex: number;
  backHref: string;
  backLabel: string;
}

export interface CardEditionOption {
  value: CardEdition;
  label: string;
  shortLabel: string;
  isSelected: boolean;
  isAvailable: boolean;
  printingId: string | null;
}

export interface PokemonCategoryQueryOptions {
  client?: SupabaseClient;
  query?: string;
  rarities?: readonly string[];
  setSlugs?: readonly string[];
  page?: number;
  pageSize?: number;
  sort?: PokemonSort;
}

export interface MapPokemonCategoryOptions {
  availableSets?: AvailableSetOption[];
  availableRarities?: string[];
  selectedRarities?: string[];
  selectedSetSlugs?: string[];
  query?: string;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  sort?: PokemonSort;
}

export interface TcgCategoryOverviewOptions {
  client?: SupabaseClient;
}

interface CardGameCountRow {
  id: string;
  game_id: string | null;
}

interface CardSetGameCountRow {
  id: string;
  game_id: string | null;
}

interface PrintingCardJoinRow {
  id: string;
  card_id: string | null;
}

interface PriceSnapshotPrintingJoinRow {
  card_printing_id: string | null;
}

interface GameCountRow {
  game_id: string;
  count: number;
}

interface RecommendedSnapshotCandidateRow {
  card_printing_id: string | null;
  snapshot_date: string;
  display_avg_price: number | null;
  avg_price: number | null;
}

interface PrintingCardIdRow {
  id: string;
  card_id: string | null;
}

const PRICE_SNAPSHOT_SELECT_WITH_DISPLAY =
  'snapshot_date, market, currency, source_currency, source_avg_price, source_min_price, source_max_price, display_currency, display_avg_price, display_min_price, display_max_price, fx_rate, fx_rate_date, fx_provider, variant, condition_label, source_name, source_url, aggregation_method, avg_price, min_price, max_price, sample_count, grade_company, grade_value, listings';

const PRICE_SNAPSHOT_SELECT_LEGACY =
  'snapshot_date, market, currency, variant, condition_label, source_name, source_url, aggregation_method, avg_price, min_price, max_price, sample_count, grade_company, grade_value';

const CARD_EDITION_CONFIG: Record<
  CardEdition,
  { label: string; shortLabel: string; language: string; region: string }
> = {
  kr: { label: '한국판', shortLabel: 'KR', language: 'ko', region: 'KR' },
  jp: { label: '일본판', shortLabel: 'JP', language: 'ja', region: 'JP' },
  na: { label: '미국판', shortLabel: 'US', language: 'en', region: 'NA' },
};

const CARD_EDITION_ORDER: CardEdition[] = ['kr', 'jp', 'na'];

const POKEMON_CARD_LIST_SELECT = [
  'id',
  'slug',
  'name',
  'collector_number',
  'rarity',
  'image_url',
  'thumbnail_url',
  'card_sets(slug, name, name_ko)',
  'card_printings(id, language, region, set_name, set_code, collector_number, rarity, finish, image_url, external_ids)',
].join(', ');

export async function getTcgCategoryOverview(
  options: TcgCategoryOverviewOptions = {},
): Promise<TcgCategoryOverview[]> {
  if (options.client) return loadTcgCategoryOverview(options.client);
  return tcgCategoryOverviewCached();
}

const tcgCategoryOverviewCached = unstable_cache(
  () => loadTcgCategoryOverview(createPublicClient()),
  ['tcg-category-overview'],
  { tags: [CATALOG_CACHE_TAG, PRICES_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

interface TcgCategoryCountsRow {
  game_id: string;
  card_count: number | string | null;
  set_count: number | string | null;
  snapshot_count: number | string | null;
}

/**
 * Fetches per-game card/set/snapshot counts in a single aggregate query
 * (`get_tcg_category_counts` RPC). Returns `null` when the function is not
 * available yet (e.g. the migration hasn't been applied), so the caller can fall
 * back to the slower full-table count path.
 */
async function fetchTcgCategoryCounts(supabase: SupabaseClient): Promise<{
  cardCounts: GameCountRow[];
  setCounts: GameCountRow[];
  snapshotCounts: GameCountRow[];
} | null> {
  const { data, error } = await supabase.rpc('get_tcg_category_counts');
  if (error || !data) return null;

  const rows = data as TcgCategoryCountsRow[];
  return {
    cardCounts: rows.map((row) => ({ game_id: row.game_id, count: Number(row.card_count ?? 0) })),
    setCounts: rows.map((row) => ({ game_id: row.game_id, count: Number(row.set_count ?? 0) })),
    snapshotCounts: rows.map((row) => ({
      game_id: row.game_id,
      count: Number(row.snapshot_count ?? 0),
    })),
  };
}

async function loadTcgCategoryOverview(supabase: SupabaseClient): Promise<TcgCategoryOverview[]> {
  const gameResult = await supabase
    .from('tcg_games')
    .select('id, slug, name, name_ko, description')
    .order('display_order', { ascending: true });

  throwIfSupabaseError(gameResult.error);

  const games = (gameResult.data ?? []) as TcgCategoryOverviewGameRow[];

  // Preferred path: a single aggregate query returns every count, so we never
  // read the full (and ever-growing) snapshot/card/printing tables just to size
  // them. Falls back to the JS count path when the RPC isn't deployed yet.
  const rpcCounts = await fetchTcgCategoryCounts(supabase);
  if (rpcCounts) {
    return mapTcgCategoryOverviewRows({
      games,
      cards: [],
      sets: [],
      printings: [],
      snapshots: [],
      cardCounts: rpcCounts.cardCounts,
      setCounts: rpcCounts.setCounts,
      snapshotCounts: rpcCounts.snapshotCounts,
    });
  }

  const gameIds = games.map((game) => game.id);

  const [cardResult, setResult, printingResult, snapshotResult, cardCounts, setCounts] =
    await Promise.all([
      supabase.from('cards').select('id, game_id'),
      supabase.from('card_sets').select('id, game_id'),
      supabase.from('card_printings').select('id, card_id'),
      supabase.from('card_price_snapshots').select('card_printing_id'),
      countRowsByGameId(supabase, 'cards', gameIds),
      countRowsByGameId(supabase, 'card_sets', gameIds),
    ]);

  throwIfSupabaseError(cardResult.error);
  throwIfSupabaseError(setResult.error);
  throwIfSupabaseError(printingResult.error);
  throwIfSupabaseError(snapshotResult.error);

  return mapTcgCategoryOverviewRows({
    games,
    cards: (cardResult.data ?? []) as CardGameCountRow[],
    sets: (setResult.data ?? []) as CardSetGameCountRow[],
    cardCounts,
    setCounts,
    printings: (printingResult.data ?? []) as PrintingCardJoinRow[],
    snapshots: (snapshotResult.data ?? []) as PriceSnapshotPrintingJoinRow[],
  });
}

export function mapTcgCategoryOverviewRows({
  games,
  cards,
  sets,
  cardCounts: exactCardCounts,
  setCounts: exactSetCounts,
  snapshotCounts: exactSnapshotCounts,
  printings,
  snapshots,
}: {
  games: readonly TcgCategoryOverviewGameRow[];
  cards: readonly CardGameCountRow[];
  sets: readonly CardSetGameCountRow[];
  cardCounts?: readonly GameCountRow[];
  setCounts?: readonly GameCountRow[];
  snapshotCounts?: readonly GameCountRow[];
  printings: readonly PrintingCardJoinRow[];
  snapshots: readonly PriceSnapshotPrintingJoinRow[];
}): TcgCategoryOverview[] {
  const gameByCardId = new Map<string, string>();
  const cardCounts = new Map<string, number>();
  for (const card of cards) {
    if (!card.game_id) continue;
    gameByCardId.set(card.id, card.game_id);
    cardCounts.set(card.game_id, (cardCounts.get(card.game_id) ?? 0) + 1);
  }
  applyExactCounts(cardCounts, exactCardCounts);

  const setCounts = new Map<string, number>();
  for (const set of sets) {
    if (!set.game_id) continue;
    setCounts.set(set.game_id, (setCounts.get(set.game_id) ?? 0) + 1);
  }
  applyExactCounts(setCounts, exactSetCounts);

  const gameByPrintingId = new Map<string, string>();
  for (const printing of printings) {
    if (!printing.card_id) continue;
    const gameId = gameByCardId.get(printing.card_id);
    if (gameId) gameByPrintingId.set(printing.id, gameId);
  }

  const priceSnapshotCounts = new Map<string, number>();
  for (const snapshot of snapshots) {
    if (!snapshot.card_printing_id) continue;
    const gameId = gameByPrintingId.get(snapshot.card_printing_id);
    if (!gameId) continue;
    priceSnapshotCounts.set(gameId, (priceSnapshotCounts.get(gameId) ?? 0) + 1);
  }
  applyExactCounts(priceSnapshotCounts, exactSnapshotCounts);

  const defaultSlugs = new Set<string>(DEFAULT_TCG_CATEGORY_BASE.map((category) => category.slug));
  const gamesBySlug = new Map(games.map((game) => [game.slug, game] as const));
  const orderedCategories = [
    ...DEFAULT_TCG_CATEGORY_BASE.map((base) => ({
      base,
      game: gamesBySlug.get(base.slug) ?? null,
    })),
    ...games
      .filter((game) => !defaultSlugs.has(game.slug))
      .map((game) => ({
        base: null,
        game,
      })),
  ];

  return orderedCategories.map(({ base, game }) => {
    const cardCount = game ? (cardCounts.get(game.id) ?? 0) : 0;
    const setCount = game ? (setCounts.get(game.id) ?? 0) : 0;
    const priceSnapshotCount = game ? (priceSnapshotCounts.get(game.id) ?? 0) : 0;
    const status = getCategoryOverviewStatus(cardCount, priceSnapshotCount);
    const slug = game?.slug ?? base?.slug ?? 'unknown';
    const name = game?.name_ko ?? game?.name ?? base?.name ?? slug;

    return {
      slug,
      name,
      description: game?.description ?? base?.description ?? `${name} 카탈로그를 준비 중입니다.`,
      href: `/categories/${slug}`,
      cardCount,
      setCount,
      priceSnapshotCount,
      status,
      statusLabel: getCategoryOverviewStatusLabel(status),
    };
  });
}

export async function getPokemonCategoryPageData(
  options: PokemonCategoryQueryOptions = {},
): Promise<PokemonCategoryPageData | null> {
  if (options.client) return loadPokemonCategoryPageData(options.client, options);
  return pokemonCategoryPageDataCached(
    options.query ?? '',
    options.rarities ?? [],
    options.setSlugs ?? [],
    options.sort ?? 'best',
    options.page ?? 1,
    options.pageSize ?? DEFAULT_POKEMON_PAGE_SIZE,
  );
}

const pokemonCategoryPageDataCached = unstable_cache(
  (
    query: string,
    rarities: readonly string[],
    setSlugs: readonly string[],
    sort: PokemonSort,
    page: number,
    pageSize: number,
  ) =>
    loadPokemonCategoryPageData(createPublicClient(), {
      query,
      rarities,
      setSlugs,
      sort,
      page,
      pageSize,
    }),
  ['pokemon-category-page'],
  { tags: [CATALOG_CACHE_TAG, PRICES_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

interface PokemonSetRow {
  id: string;
  slug: string;
  name: string;
  name_ko: string | null;
}

export interface PokemonFilterOptions {
  game: TcgGameRow;
  allSets: PokemonSetRow[];
  availableSets: AvailableSetOption[];
  availableRarities: string[];
}

/**
 * Sets and rarities for the pokemon category filter bar. They change only on
 * catalog import (never on price updates), so they live in their own cache keyed
 * solely by category — shared across every filter/sort/page combination instead
 * of being recomputed inside each per-page cache entry. Previously every cold
 * filter navigation re-fetched the full sets list and re-streamed every card's
 * rarity; now that work happens once per revalidate window. Tagged CATALOG only
 * so the daily price revalidation never busts it.
 */
const pokemonFilterOptionsCached = unstable_cache(
  () => loadPokemonFilterOptions(createPublicClient()),
  ['pokemon-filter-options'],
  { tags: [CATALOG_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

async function getPokemonFilterOptions(
  client?: SupabaseClient,
): Promise<PokemonFilterOptions | null> {
  if (client) return loadPokemonFilterOptions(client);
  return pokemonFilterOptionsCached();
}

async function loadPokemonFilterOptions(
  supabase: SupabaseClient,
): Promise<PokemonFilterOptions | null> {
  const { data: gameData, error: gameError } = await supabase
    .from('tcg_games')
    .select('id, slug, name, name_ko, description')
    .eq('slug', 'pokemon')
    .maybeSingle();

  throwIfSupabaseError(gameError);

  const game = gameData as TcgGameRow | null;
  if (!game) return null;

  const [setsResult, raritiesResult] = await Promise.all([
    supabase
      .from('card_sets')
      .select('id, slug, name, name_ko')
      .eq('game_id', game.id)
      .order('slug', { ascending: true }),
    supabase.from('cards').select('rarity').eq('game_id', game.id).not('rarity', 'is', null),
  ]);

  throwIfSupabaseError(setsResult.error);
  throwIfSupabaseError(raritiesResult.error);

  const allSets = (setsResult.data ?? []) as PokemonSetRow[];
  const availableSets: AvailableSetOption[] = allSets.map((row) => ({
    slug: row.slug,
    name: row.name_ko ?? row.name,
  }));

  const availableRarities = Array.from(
    new Set(
      ((raritiesResult.data ?? []) as Array<{ rarity: string | null }>)
        .map((row) => row.rarity)
        .filter((rarity): rarity is string => Boolean(rarity)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ko-KR'));

  return { game, allSets, availableSets, availableRarities };
}

async function loadPokemonCategoryPageData(
  supabase: SupabaseClient,
  options: PokemonCategoryQueryOptions = {},
): Promise<PokemonCategoryPageData | null> {
  const {
    query = '',
    rarities,
    setSlugs,
    page = 1,
    pageSize = DEFAULT_POKEMON_PAGE_SIZE,
    sort = 'best',
  } = options;
  const trimmedQuery = query.trim();
  const selectedRarities = normalizeStringList(rarities);
  const selectedSetSlugs = normalizeStringList(setSlugs);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_POKEMON_PAGE_SIZE;
  const rangeFrom = (safePage - 1) * safePageSize;
  const rangeTo = rangeFrom + safePageSize - 1;

  const filterOptions = await getPokemonFilterOptions(options.client);
  if (!filterOptions) return null;

  const { game, allSets, availableSets, availableRarities } = filterOptions;

  const baseMapOptions: MapPokemonCategoryOptions = {
    availableSets,
    availableRarities,
    selectedRarities,
    selectedSetSlugs,
    query: trimmedQuery,
    page: safePage,
    pageSize: safePageSize,
    sort,
  };

  let setIdsForFilter: string[] | null = null;
  if (selectedSetSlugs.length > 0) {
    setIdsForFilter = allSets
      .filter((row) => selectedSetSlugs.includes(row.slug))
      .map((row) => row.id);
    if (setIdsForFilter.length === 0) {
      return mapPokemonCategoryPageData(game, [], { ...baseMapOptions, totalCount: 0 });
    }
  }

  const buildCardQuery = (
    columns = POKEMON_CARD_LIST_SELECT,
    selectOptions: { count?: 'exact'; head?: boolean } = { count: 'exact' },
  ) => {
    let cardQuery = supabase.from('cards').select(columns, selectOptions).eq('game_id', game.id);

    if (trimmedQuery) {
      cardQuery = cardQuery.ilike('name', `%${trimmedQuery}%`);
    }

    if (selectedRarities.length > 0) {
      cardQuery = cardQuery.in('rarity', selectedRarities);
    }

    if (setIdsForFilter) {
      cardQuery = cardQuery.in('set_id', setIdsForFilter);
    }

    return cardQuery;
  };

  if (sort === 'best') {
    const filteredCardQuery = buildCardQuery as unknown as BuildPokemonCardQuery;
    const [{ count, error: countError }, recommendedCardIds] = await Promise.all([
      buildCardQuery('id', { count: 'exact', head: true }),
      getRecommendedPricedCardIds(supabase),
    ]);

    throwIfSupabaseError(countError);

    const totalCount = count ?? 0;
    const pricedRows = await fetchCardRowsByIdsInOrder(filteredCardQuery, recommendedCardIds);
    const pricedCardIds = new Set(pricedRows.map((row) => row.id));
    const pricedCount = pricedRows.length;
    const selectedRows = pricedRows.slice(rangeFrom, rangeTo + 1);
    const remainingPageSize = safePageSize - selectedRows.length;

    if (remainingPageSize > 0) {
      const fallbackOffset = Math.max(0, rangeFrom - pricedCount);
      const fallbackRows = await fetchUnpricedFallbackRows({
        buildCardQuery: filteredCardQuery,
        excludedCardIds: pricedCardIds,
        offset: fallbackOffset,
        limit: remainingPageSize,
      });
      selectedRows.push(...fallbackRows);
    }

    const snapshotsByPrinting = await fetchSnapshotsByPrinting(
      supabase,
      collectPrimaryPrintingIds(selectedRows),
    );

    return mapPokemonCategoryPageData(
      game,
      selectedRows,
      { ...baseMapOptions, totalCount },
      snapshotsByPrinting,
    );
  }

  const orderedQuery =
    sort === 'name-asc'
      ? buildCardQuery().order('name', { ascending: true })
      : buildCardQuery().order('name', { ascending: false });

  const { data: cardData, error: cardError, count } = await orderedQuery.range(rangeFrom, rangeTo);

  throwIfSupabaseError(cardError);

  const cardRows = (cardData ?? []) as unknown as PokemonCatalogCardRow[];
  const snapshotsByPrinting = await fetchSnapshotsByPrinting(
    supabase,
    collectPrimaryPrintingIds(cardRows),
  );

  return mapPokemonCategoryPageData(
    game,
    cardRows,
    { ...baseMapOptions, totalCount: count ?? 0 },
    snapshotsByPrinting,
  );
}

interface CardQueryResult {
  data: unknown[] | null;
  error: SupabaseErrorLike | null;
  count?: number | null;
}

interface CardQuery extends PromiseLike<CardQueryResult> {
  in(column: string, values: readonly string[]): CardQuery;
  not(column: string, operator: string, value: string): CardQuery;
  order(column: string, options: { ascending: boolean }): CardQuery;
  range(from: number, to: number): CardQuery;
}

type BuildPokemonCardQuery = (
  columns?: string,
  selectOptions?: { count?: 'exact'; head?: boolean },
) => CardQuery;

async function getRecommendedPricedCardIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('card_price_snapshots')
    .select('card_printing_id, snapshot_date, display_avg_price, avg_price')
    .not('card_printing_id', 'is', null)
    .order('snapshot_date', { ascending: false })
    .limit(RECOMMENDED_CANDIDATE_FETCH_LIMIT);

  throwIfSupabaseError(error);

  // Keep the latest price per printing; the recommended order surfaces the most
  // expensive cards first (비싼 시세 = 인기). Rows arrive newest-first, so the
  // first one seen for a printing is its latest snapshot.
  const priceByPrinting = new Map<string, number>();
  for (const row of (data ?? []) as RecommendedSnapshotCandidateRow[]) {
    if (!row.card_printing_id || priceByPrinting.has(row.card_printing_id)) continue;
    const price = row.display_avg_price ?? row.avg_price;
    if (price == null) continue;
    priceByPrinting.set(row.card_printing_id, price);
  }

  const printingIds = Array.from(priceByPrinting.keys());
  if (printingIds.length === 0) return [];

  const cardIdByPrinting = new Map<string, string>();
  for (const chunk of chunkStrings(printingIds, SNAPSHOT_FETCH_CHUNK_SIZE)) {
    const { data: printingData, error: printingError } = await supabase
      .from('card_printings')
      .select('id, card_id')
      .in('id', chunk);

    throwIfSupabaseError(printingError);

    for (const row of (printingData ?? []) as PrintingCardIdRow[]) {
      if (row.card_id) cardIdByPrinting.set(row.id, row.card_id);
    }
  }

  // A card may span multiple printings, so take each card's most expensive one.
  const priceByCard = new Map<string, number>();
  for (const [printingId, price] of priceByPrinting) {
    const cardId = cardIdByPrinting.get(printingId);
    if (!cardId) continue;
    priceByCard.set(cardId, Math.max(priceByCard.get(cardId) ?? 0, price));
  }

  return Array.from(priceByCard.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([cardId]) => cardId);
}

async function fetchCardRowsByIdsInOrder(
  buildCardQuery: BuildPokemonCardQuery,
  cardIds: readonly string[],
): Promise<PokemonCatalogCardRow[]> {
  if (cardIds.length === 0) return [];

  const rows: PokemonCatalogCardRow[] = [];
  for (const chunk of chunkStrings(cardIds, SNAPSHOT_FETCH_CHUNK_SIZE)) {
    const { data, error } = await buildCardQuery().in('id', chunk);
    throwIfSupabaseError(error);
    rows.push(...((data ?? []) as unknown as PokemonCatalogCardRow[]));
  }

  const rowById = new Map(rows.map((row) => [row.id, row] as const));
  return cardIds
    .map((cardId) => rowById.get(cardId))
    .filter((row): row is PokemonCatalogCardRow => row !== undefined);
}

async function fetchUnpricedFallbackRows({
  buildCardQuery,
  excludedCardIds,
  offset,
  limit,
}: {
  buildCardQuery: BuildPokemonCardQuery;
  excludedCardIds: ReadonlySet<string>;
  offset: number;
  limit: number;
}): Promise<PokemonCatalogCardRow[]> {
  if (limit <= 0) return [];

  let query = buildCardQuery().order('slug', { ascending: true });
  if (excludedCardIds.size > 0) {
    query = query.not('id', 'in', formatPostgrestInList(Array.from(excludedCardIds)));
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  throwIfSupabaseError(error);

  return (data ?? []) as unknown as PokemonCatalogCardRow[];
}

function chunkStrings(values: readonly string[], chunkSize: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function formatPostgrestInList(values: readonly string[]): string {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(',')})`;
}

export interface FeaturedPokemonCardsOptions {
  client?: SupabaseClient;
  limit?: number;
}

export async function getFeaturedPokemonCards(
  options: FeaturedPokemonCardsOptions = {},
): Promise<PokemonCatalogCard[]> {
  const { client, limit = 8 } = options;
  if (client) return loadFeaturedPokemonCards(client, limit);
  return featuredPokemonCardsCached(limit);
}

const featuredPokemonCardsCached = unstable_cache(
  (limit: number) => loadFeaturedPokemonCards(createPublicClient(), limit),
  ['featured-pokemon-cards'],
  { tags: [CATALOG_CACHE_TAG, PRICES_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

async function loadFeaturedPokemonCards(
  supabase: SupabaseClient,
  limit: number,
): Promise<PokemonCatalogCard[]> {
  const { data: gameData, error: gameError } = await supabase
    .from('tcg_games')
    .select('id')
    .eq('slug', 'pokemon')
    .maybeSingle();

  throwIfSupabaseError(gameError);

  const game = gameData as { id: string } | null;
  if (!game) return [];

  const { data: cardData, error: cardError } = await supabase
    .from('cards')
    .select(POKEMON_CARD_LIST_SELECT)
    .eq('game_id', game.id)
    .order('slug', { ascending: true });

  throwIfSupabaseError(cardError);

  const rows = (cardData ?? []) as unknown as PokemonCatalogCardRow[];

  // Order by recommendation ("추천순") — most expensive cards first — so the
  // featured grid surfaces the same top cards as the catalog's default sort,
  // with slug order as the tiebreaker/fallback.
  const recommendedCardIds = await getRecommendedPricedCardIds(supabase);
  const recommendationRank = new Map(
    recommendedCardIds.map((cardId, index) => [cardId, index] as const),
  );
  const orderedRows = [...rows].sort((a, b) => {
    const aRank = recommendationRank.get(a.id) ?? Number.POSITIVE_INFINITY;
    const bRank = recommendationRank.get(b.id) ?? Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return a.slug.localeCompare(b.slug);
  });

  // Pick the featured subset first (image filter + limit), then load prices only
  // for those few printings instead of the whole catalog.
  const featured = selectFeaturedPokemonCards(
    orderedRows.map((row) => mapCatalogCardRow(row)),
    limit,
  );
  const rowBySlug = new Map(rows.map((row) => [row.slug, row] as const));
  const featuredRows = featured
    .map((card) => rowBySlug.get(card.slug))
    .filter((row): row is PokemonCatalogCardRow => row !== undefined);

  const snapshotsByPrinting = await fetchSnapshotsByPrinting(
    supabase,
    collectPrimaryPrintingIds(featuredRows),
  );

  return featuredRows.map((row) => mapCatalogCardRow(row, snapshotsByPrinting));
}

export function selectFeaturedPokemonCards(
  cards: readonly PokemonCatalogCard[],
  limit = 8,
): PokemonCatalogCard[] {
  return cards.filter((card) => card.imageUrl !== null && card.imageUrl !== '').slice(0, limit);
}

/**
 * Normalizes a card slug coming from a route param. Next can hand the dynamic
 * segment over still percent-encoded (e.g. Korean `피콘` as `%ED%94%BC...`), so
 * we decode it and normalize to NFC to match the slugs stored in the DB. Slugs
 * passed already-decoded (internal callers) pass through unchanged.
 */
function normalizeCardSlug(raw: string): string {
  let value = raw;
  if (value.includes('%')) {
    try {
      value = decodeURIComponent(value);
    } catch {
      // Not valid percent-encoding — keep the raw value.
    }
  }
  return value.normalize('NFC');
}

export async function getCardDetailBySlug(
  slug: string,
  client?: SupabaseClient,
  options: { edition?: CardEdition } = {},
): Promise<CatalogCardDetail | null> {
  const edition = options.edition ?? 'kr';
  if (client) return loadCardDetailBySlug(client, slug, edition);
  return cardDetailBySlugCached(slug, edition);
}

const cardDetailBySlugCached = unstable_cache(
  (slug: string, edition: CardEdition) => loadCardDetailBySlug(createPublicClient(), slug, edition),
  ['card-detail-by-slug'],
  { tags: [CATALOG_CACHE_TAG, PRICES_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

async function loadCardDetailBySlug(
  supabase: SupabaseClient,
  slug: string,
  edition: CardEdition,
): Promise<CatalogCardDetail | null> {
  const { data, error } = await supabase
    .from('cards')
    .select(
      [
        'id',
        'slug',
        'name',
        'collector_number',
        'rarity',
        'image_url',
        'thumbnail_url',
        'tcg_games(slug, name, name_ko)',
        'card_sets(slug, name, name_ko)',
        'card_printings(id, language, region, set_name, set_code, collector_number, rarity, finish, image_url, external_ids)',
      ].join(', '),
    )
    .eq('slug', normalizeCardSlug(slug))
    .maybeSingle();

  throwIfSupabaseError(error);

  if (!data) return null;

  const detailRow = data as unknown as CardDetailRow;
  const printing = selectPrintingForEdition(detailRow, edition);
  const printingId = printing?.id ?? detailRow.id;

  const snapshotData = await fetchSnapshotRowsForPrinting(supabase, printingId);

  return mapCardDetailRow(detailRow, snapshotData, { edition });
}

interface CardRatingSummaryRow {
  average_score: number | string | null;
  rating_count: number | null;
}

/**
 * Reads the public rating aggregate for a card via the `get_card_rating_summary`
 * RPC, which exposes only the average and count — never individual user rows.
 */
export async function getCardRatingSummary(
  cardId: string,
  client?: SupabaseClient,
): Promise<CardRatingSummary> {
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase
    .rpc('get_card_rating_summary', { p_card_id: cardId })
    .maybeSingle();

  throwIfSupabaseError(error);

  const row = data as CardRatingSummaryRow | null;
  const count = row?.rating_count ?? 0;
  if (!row || count === 0 || row.average_score === null) {
    return { average: null, count: 0 };
  }

  return { average: Number(row.average_score), count };
}

/**
 * Reads the signed-in viewer's own rating for a card, or null when they have
 * not rated it (or are not signed in). RLS limits the row to the current user.
 */
export async function getViewerRating(
  cardId: string,
  client?: SupabaseClient,
): Promise<number | null> {
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase
    .from('card_ratings')
    .select('score')
    .eq('card_id', cardId)
    .maybeSingle();

  if (error && isSupabasePermissionDenied(error.message)) {
    return null;
  }

  throwIfSupabaseError(error);

  const row = data as { score: number } | null;
  return row?.score ?? null;
}

async function fetchSnapshotRowsForPrinting(
  supabase: SupabaseClient,
  printingId: string,
): Promise<CardPriceSnapshotRow[]> {
  const result = await supabase
    .from('card_price_snapshots')
    .select(PRICE_SNAPSHOT_SELECT_WITH_DISPLAY)
    .eq('card_printing_id', printingId)
    .order('snapshot_date', { ascending: true });

  if (result.error && isMissingDisplayPriceColumn(result.error.message)) {
    const legacy = await supabase
      .from('card_price_snapshots')
      .select(PRICE_SNAPSHOT_SELECT_LEGACY)
      .eq('card_printing_id', printingId)
      .order('snapshot_date', { ascending: true });
    throwIfSupabaseError(legacy.error);
    return (legacy.data ?? []) as CardPriceSnapshotRow[];
  }

  throwIfSupabaseError(result.error);
  return (result.data ?? []) as CardPriceSnapshotRow[];
}

export async function fetchSnapshotRowsForPrintings(
  supabase: SupabaseClient,
  printingIds: readonly string[],
): Promise<Array<CardPriceSnapshotRow & { card_printing_id: string }>> {
  const result = await supabase
    .from('card_price_snapshots')
    .select(`card_printing_id, ${PRICE_SNAPSHOT_SELECT_WITH_DISPLAY}`)
    .in('card_printing_id', printingIds)
    .order('snapshot_date', { ascending: true });

  if (result.error && isMissingDisplayPriceColumn(result.error.message)) {
    const legacy = await supabase
      .from('card_price_snapshots')
      .select(`card_printing_id, ${PRICE_SNAPSHOT_SELECT_LEGACY}`)
      .in('card_printing_id', printingIds)
      .order('snapshot_date', { ascending: true });
    throwIfSupabaseError(legacy.error);
    return (legacy.data ?? []) as Array<CardPriceSnapshotRow & { card_printing_id: string }>;
  }

  throwIfSupabaseError(result.error);
  return (result.data ?? []) as Array<CardPriceSnapshotRow & { card_printing_id: string }>;
}

/**
 * Batch-loads price snapshots for a set of printings, grouped by printing id, so
 * a list page can derive real prices without one query per card. Returns an
 * empty map when given no ids.
 */
export async function fetchSnapshotsByPrinting(
  supabase: SupabaseClient,
  printingIds: readonly string[],
): Promise<Map<string, CardPriceSnapshotRow[]>> {
  const byPrinting = new Map<string, CardPriceSnapshotRow[]>();
  if (printingIds.length === 0) return byPrinting;

  for (let index = 0; index < printingIds.length; index += SNAPSHOT_FETCH_CHUNK_SIZE) {
    const chunk = printingIds.slice(index, index + SNAPSHOT_FETCH_CHUNK_SIZE);
    const data = await fetchSnapshotRowsForPrintings(supabase, chunk);

    for (const row of (data ?? []) as Array<CardPriceSnapshotRow & { card_printing_id: string }>) {
      const list = byPrinting.get(row.card_printing_id);
      if (list) list.push(row);
      else byPrinting.set(row.card_printing_id, [row]);
    }
  }

  return byPrinting;
}

/** Collects the primary printing id of each card row (Korean printing preferred). */
function collectPrimaryPrintingIds(rows: readonly PokemonCatalogCardRow[]): string[] {
  return rows
    .map((row) => selectPrimaryPrinting(row)?.id)
    .filter((id): id is string => Boolean(id));
}

export function mapPokemonCategoryPageData(
  game: TcgGameRow,
  rows: readonly PokemonCatalogCardRow[],
  options: MapPokemonCategoryOptions = {},
  snapshotsByPrinting?: ReadonlyMap<string, CardPriceSnapshotRow[]>,
): PokemonCategoryPageData {
  const cards = sortPokemonCatalogCardsByRecommendation(
    rows.map((row) => mapCatalogCardRow(row, snapshotsByPrinting)),
    options.sort ?? 'best',
  );

  return {
    gameName: game.name,
    gameNameKo: game.name_ko ?? game.name,
    description:
      game.description ?? '포켓몬 카드의 대표 한국판 카탈로그를 세트와 레어도 기준으로 탐색하세요.',
    availableSets: options.availableSets ?? deriveAvailableSetsFromCards(cards),
    availableRarities: options.availableRarities ?? deriveAvailableRaritiesFromCards(cards),
    selectedRarities: options.selectedRarities ?? [],
    selectedSetSlugs: options.selectedSetSlugs ?? [],
    cards,
    query: options.query ?? '',
    totalCount: options.totalCount ?? cards.length,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? DEFAULT_POKEMON_PAGE_SIZE,
    sort: options.sort ?? 'best',
  };
}

export function sortPokemonCatalogCardsByRecommendation(
  cards: readonly PokemonCatalogCard[],
  sort: PokemonSort = 'best',
): PokemonCatalogCard[] {
  const sorted = [...cards];
  if (sort !== 'best') return sorted;

  sorted.sort(compareRecommendedCards);
  return sorted;
}

function compareRecommendedCards(a: PokemonCatalogCard, b: PokemonCatalogCard): number {
  // Recommended order ("추천순") surfaces the most expensive cards first
  // (비싼 시세 = 인기). Cards with no usable price sort last.
  const aHasPrice = a.price !== null;
  const bHasPrice = b.price !== null;
  if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
  if (a.price && b.price) {
    const priceDelta = b.price.avgPrice - a.price.avgPrice;
    if (priceDelta !== 0) return priceDelta;
  }

  return a.slug.localeCompare(b.slug);
}

export function mapCardDetailRow(
  row: CardDetailRow,
  snapshots: readonly CardPriceSnapshotRow[] = [],
  options: { edition?: CardEdition } = {},
): CatalogCardDetail {
  const requestedEdition = options.edition ?? 'kr';
  const printing = selectPrintingForEdition(row, requestedEdition);
  const selectedEdition = getPrintingEdition(printing) ?? requestedEdition;
  const sampleId = getSampleId(printing);
  const setLabel =
    row.card_sets?.name_ko ?? row.card_sets?.name ?? printing?.set_name ?? '세트 미상';
  const collectorNumber = printing?.collector_number ?? row.collector_number ?? '번호 미상';
  const rarity = printing?.rarity ?? row.rarity ?? '레어도 미상';
  const gameName = row.tcg_games?.name_ko ?? row.tcg_games?.name ?? 'Pokemon TCG';

  const priceHistory = buildPriceHistory(snapshots);
  const price =
    derivePriceDisplayFromHistory(priceHistory) ??
    createDeterministicPriceDisplay(row.slug, sampleId);
  const { listings: ebayListings, featuredIndex: featuredListingIndex } = deriveEbayListings(
    snapshots,
    price.avgPrice,
  );

  return {
    cardId: row.id,
    slug: row.slug,
    metaTitle: `TCGround | ${row.name} - ${setLabel}`,
    metaDescription: `${setLabel} ${row.name} 카드의 세트, 레어도, 번호와 가격 요약을 확인하세요.`,
    chips: [gameName, setLabel, rarity, collectorNumber],
    cardName: row.name,
    setLabel,
    collectorNumber,
    rarity,
    imageUrl: printing?.image_url ?? row.image_url,
    price,
    selectedEdition,
    editionOptions: buildEditionOptions(row, selectedEdition),
    priceHistory,
    ebayListings,
    featuredListingIndex,
    printing: {
      id: printing?.id ?? row.id,
      language: printing?.language ?? 'ko',
      region: printing?.region ?? 'KR',
      setCode: printing?.set_code ?? 'unknown',
      collectorNumber,
      finish: printing?.finish ?? 'unknown',
      sampleId,
      nameEn: getExternalString(printing, 'name_en'),
      nameJa: getExternalString(printing, 'name_ja'),
    },
    backHref: '/categories/pokemon',
    backLabel: '포켓몬 카테고리로 돌아가기',
  };
}

export function createDeterministicPriceDisplay(slug: string, sampleId: string): PriceDisplay {
  const sampleNumber = Number.parseInt(sampleId.replace(/\D/g, ''), 10);
  const index = Number.isFinite(sampleNumber) && sampleNumber > 0 ? sampleNumber : stableHash(slug);
  const hashOffset = stableHash(slug) % 9;
  const avgPrice = roundToNearest(42000 + index * 17000 + hashOffset * 2500, 1000);
  const minPrice = roundToNearest(avgPrice * 0.82, 1000);
  const maxPrice = roundToNearest(avgPrice * 1.26, 1000);
  const rawChange = ((index % 7) - 3) * 2.1;
  const changeRate = Number(rawChange.toFixed(1));

  return {
    avgPrice,
    minPrice,
    maxPrice,
    changeRate,
    changeTone: getChangeTone(changeRate),
    lastUpdatedAt: '2026년 5월 22일',
    stalenessDays: 0,
    sourceLabel: '가격 데이터 연결 전까지 카탈로그 대표값을 표시합니다.',
    currency: 'KRW',
    sampleCount: 0,
  };
}

/**
 * Builds the detail chart history from snapshots. Snapshots mix currencies,
 * markets, variants, conditions and grades, so we never draw them all as one
 * line. Instead we pick a single coherent bucket — same currency, market,
 * variant and grade — and draw that as the trend. The eBay Browse asking series is
 * preferred; otherwise the richest sold bucket forms the line, with comparable
 * sold points overlaid only when an asking trend is present.
 *
 * Raw (ungraded) buckets are preferred so the trend axis stays on comparable
 * prices. Graded-only data only forms the trend as a fallback when no raw data
 * exists — in that case `gradeLabel` records the grade so the UI can tell the
 * user which grade the chart is showing.
 */
export function buildPriceHistory(snapshots: readonly CardPriceSnapshotRow[]): PriceHistory {
  const priced = snapshots.filter((snapshot) => snapshotAvgPrice(snapshot) !== null);
  // Asking sources (eBay Browse, KREAM, 번개장터, 중고나라) form the trend line;
  // sold sources (eBay sold, manual completed-sale imports) form the overlay.
  const askingRows = priced.filter((snapshot) => isAskingSnapshot(snapshot));
  const soldRows = priced.filter((snapshot) => !isAskingSnapshot(snapshot));

  const askingBucket = pickRichestBucket(askingRows);
  const askingSeries = askingBucket ? collapseByDate(askingBucket.rows) : [];

  // When an asking trend exists, overlay only sold points from the matching
  // bucket (same currency/variant/grade) so graded prices never distort the raw
  // axis. Otherwise the richest sold bucket becomes the trend line itself — and
  // since raw buckets are preferred, graded data only surfaces here when it is
  // the only data the card has.
  let soldPoints: PricePoint[] = [];
  let trendBucket = askingBucket;
  if (askingBucket) {
    soldPoints = collapseByDate(soldRows.filter((row) => bucketKey(row) === askingBucket.key));
  } else {
    const soldBucket = pickRichestBucket(soldRows);
    if (soldBucket) {
      soldPoints = collapseByDate(soldBucket.rows);
      trendBucket = soldBucket;
    }
  }

  const currency = askingSeries[0]?.currency ?? soldPoints[0]?.currency ?? null;
  const gradeLabel = trendBucket ? gradeLabelForRows(trendBucket.rows) : null;

  return {
    askingSeries,
    soldPoints,
    currency,
    gradeLabel,
    hasData: askingSeries.length > 0 || soldPoints.length > 0,
  };
}

/**
 * The series drawn as the detail chart's trend line and used for the price
 * summary: the asking trend when available, otherwise the coherent sold series.
 */
export function getPriceTrendSeries(history: PriceHistory): PricePoint[] {
  return history.askingSeries.length > 0 ? history.askingSeries : history.soldPoints;
}

/**
 * Classifies a snapshot as asking vs sold.
 *
 * `source_name` alone is not enough: `manual_bunjang` can appear as either a
 * sold-out manual evidence row or a current asking row. Prefer the aggregation
 * method when present and fall back to source naming for legacy rows.
 */
function isAskingSnapshot(snapshot: CardPriceSnapshotRow): boolean {
  const method = snapshot.aggregation_method ?? '';
  if (method.includes('asking')) return true;
  if (method === 'median_filtered' || method.includes('sold')) return false;
  return isAskingSource(snapshot.source_name);
}

/** True when a snapshot has no grading assigned (raw card). */
function isUngraded(snapshot: CardPriceSnapshotRow): boolean {
  return !snapshot.grade_company && !snapshot.grade_value;
}

/** Human-readable grade for a coherent bucket's rows, or null when ungraded. */
function gradeLabelForRows(rows: readonly CardPriceSnapshotRow[]): string | null {
  const sample = rows[0];
  if (!sample || isUngraded(sample)) return null;
  return [sample.grade_company, sample.grade_value].filter(Boolean).join(' ').trim() || null;
}

/**
 * Identifies a coherent, comparable bucket: one currency + market + variant +
 * grade. Condition is allowed to vary (and same-date rows are averaged in
 * `collapseByDate`) so the trend stays continuous instead of fragmenting into
 * single points. Market and grade are part of the key so JP/KR/NA and graded/raw
 * prices never mix on the same line.
 */
function bucketKey(snapshot: CardPriceSnapshotRow): string {
  return [
    snapshotDisplayCurrency(snapshot),
    snapshot.market,
    snapshot.variant,
    snapshot.grade_company ?? '',
    snapshot.grade_value ?? '',
  ].join('|');
}

/**
 * Groups rows by comparable bucket and returns the one with the most rows
 * (ties broken by the most recent date), or null when there are no rows.
 */
function pickRichestBucket(
  rows: readonly CardPriceSnapshotRow[],
): { key: string; rows: CardPriceSnapshotRow[] } | null {
  const buckets = new Map<string, CardPriceSnapshotRow[]>();
  for (const row of rows) {
    const key = bucketKey(row);
    const existing = buckets.get(key);
    if (existing) existing.push(row);
    else buckets.set(key, [row]);
  }

  let best: { key: string; rows: CardPriceSnapshotRow[] } | null = null;
  for (const [key, bucketRows] of buckets) {
    if (best === null || isRicherBucket(key, bucketRows, best)) {
      best = { key, rows: bucketRows };
    }
  }
  return best;
}

/**
 * Whether `(key, rows)` should replace `best`. Preference order, strongest
 * first: a raw (ungraded) bucket beats a graded one (graded is only a fallback
 * trend so PSA-style prices never distort the raw axis); then KRW beats other
 * currencies (this is a Korean-print catalog, so domestic prices are the most
 * relevant trend, even when there are fewer of them); then more rows; then the
 * more recent bucket.
 */
function isRicherBucket(
  key: string,
  rows: readonly CardPriceSnapshotRow[],
  best: { key: string; rows: CardPriceSnapshotRow[] },
): boolean {
  const isRaw = isUngraded(rows[0]);
  const bestIsRaw = isUngraded(best.rows[0]);
  if (isRaw !== bestIsRaw) return isRaw;

  const isKrw = key.startsWith('KRW|');
  const bestIsKrw = best.key.startsWith('KRW|');
  if (isKrw !== bestIsKrw) return isKrw;

  if (rows.length !== best.rows.length) return rows.length > best.rows.length;

  return latestDate(rows) > latestDate(best.rows);
}

function latestDate(rows: readonly CardPriceSnapshotRow[]): string {
  return rows.reduce((max, row) => (row.snapshot_date > max ? row.snapshot_date : max), '');
}

/**
 * Collapses snapshot rows into one dated point per day (averaging across markets
 * that share a date), sorted ascending — so the trend never has two points on
 * the same x position.
 */
function collapseByDate(rows: readonly CardPriceSnapshotRow[]): PricePoint[] {
  const byDate = new Map<string, CardPriceSnapshotRow[]>();
  for (const row of rows) {
    const existing = byDate.get(row.snapshot_date);
    if (existing) existing.push(row);
    else byDate.set(row.snapshot_date, [row]);
  }

  const points: PricePoint[] = [];
  for (const [date, group] of byDate) {
    const avg = group.reduce((sum, row) => sum + (snapshotAvgPrice(row) ?? 0), 0) / group.length;
    points.push({
      date,
      avgPrice: Math.round(avg * 100) / 100,
      minPrice: Math.min(...group.map((row) => snapshotMinPrice(row))),
      maxPrice: Math.max(...group.map((row) => snapshotMaxPrice(row))),
      sampleCount: group.reduce((sum, row) => sum + (row.sample_count ?? 0), 0),
      currency: snapshotDisplayCurrency(group[0]),
      sourceNames: uniqueSorted(group.map((row) => row.source_name)),
      sourceUrl: cheapestSourceUrl(group),
      sourceCurrency: pointSourceCurrency(group),
      fxRateDate: latestFxRateDate(group),
      fxProvider: pointFxProvider(group),
    });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

/**
 * Builds the KRW-converted eBay 판매중(즉시구매) listing list for the detail page
 * from the latest `ebay_browse` snapshot. Listings are price-ascending and
 * deduped by URL; `featuredIndex` points at the one closest to the eBay
 * snapshot's own display average.
 *
 * ponytail: converts with the snapshot's collection-day fx_rate, not a
 * per-listing rate. Add per-listing FX at collection time if accuracy matters.
 */
export function deriveEbayListings(
  snapshots: readonly CardPriceSnapshotRow[],
  _displayAvgPrice?: number,
): { listings: EbayListing[]; featuredIndex: number } {
  void _displayAvgPrice;
  const browseRows = snapshots.filter(
    (snapshot) =>
      snapshot.source_name === 'ebay_browse' &&
      Array.isArray(snapshot.listings) &&
      snapshot.listings.length > 0,
  );
  if (browseRows.length === 0) return { listings: [], featuredIndex: -1 };

  const latest = latestDate(browseRows);
  const latestRows = browseRows.filter((snapshot) => snapshot.snapshot_date === latest);
  const targetPrices = latestRows
    .map(snapshotAvgPriceKrw)
    .filter((price): price is number => price !== null);
  const target =
    targetPrices.length > 0
      ? targetPrices.reduce((sum, price) => sum + price, 0) / targetPrices.length
      : null;
  const byUrl = new Map<string, EbayListing>();
  for (const row of latestRows) {
    const rate = row.fx_rate ?? null;
    for (const listing of row.listings ?? []) {
      if (!listing.url || byUrl.has(listing.url)) continue;
      const priceKrw = Math.round(rate ? listing.price * rate : listing.price);
      byUrl.set(listing.url, { priceKrw, url: listing.url, title: listing.title ?? null });
    }
  }

  const listings = Array.from(byUrl.values()).sort((a, b) => a.priceKrw - b.priceKrw);
  if (listings.length === 0) return { listings: [], featuredIndex: -1 };
  if (target === null) return { listings, featuredIndex: 0 };

  let featuredIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  listings.forEach((listing, index) => {
    const diff = Math.abs(listing.priceKrw - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      featuredIndex = index;
    }
  });
  return { listings, featuredIndex };
}

/** `snapshotDate`(YYYY-MM-DD)와 `today`의 UTC 자정 기준 경과 일수. 음수는 0으로 클램프. */
function stalenessDaysSince(snapshotDate: string, today: Date): number {
  const snapshotMs = Date.parse(`${snapshotDate}T00:00:00Z`);
  const todayMs = Date.parse(`${toSnapshotDate(today.toISOString())}T00:00:00Z`);
  if (Number.isNaN(snapshotMs) || Number.isNaN(todayMs)) return 0;
  return Math.max(0, Math.round((todayMs - snapshotMs) / (24 * 60 * 60 * 1000)));
}

/** Derives the price summary from the trend series, or null when there is none. */
export function derivePriceDisplayFromHistory(
  history: PriceHistory,
  today: Date = new Date(),
): PriceDisplay | null {
  const usingAsking = history.askingSeries.length > 0;
  const series = getPriceTrendSeries(history);
  return derivePriceDisplayFromSeries(series, usingAsking, history.gradeLabel, today);
}

export function deriveAskingPriceDisplayFromHistory(
  history: PriceHistory,
  today: Date = new Date(),
): PriceDisplay | null {
  return derivePriceDisplayFromSeries(history.askingSeries, true, history.gradeLabel, today);
}

function derivePriceDisplayFromSeries(
  series: readonly PricePoint[],
  usingAsking: boolean,
  gradeLabel: string | null,
  today: Date,
): PriceDisplay | null {
  if (series.length === 0) return null;

  const latest = series[series.length - 1];
  const first = series[0];
  const changeRate =
    first.avgPrice > 0
      ? Number((((latest.avgPrice - first.avgPrice) / first.avgPrice) * 100).toFixed(1))
      : 0;

  return {
    avgPrice: latest.avgPrice,
    minPrice: latest.minPrice,
    maxPrice: latest.maxPrice,
    changeRate,
    changeTone: getChangeTone(changeRate),
    lastUpdatedAt: formatSnapshotDate(latest.date),
    stalenessDays: stalenessDaysSince(latest.date, today),
    sourceLabel: usingAsking
      ? `${formatSourceNames(latest.sourceNames) || askingSourcePrefix(latest)} 판매중 호가 ${latest.sampleCount}건 기준 (실거래가는 참조점으로 표시)${formatFxSuffix(latest)}`
      : `최근 ${formatSourceNames(latest.sourceNames) || '수동 evidence'} ${gradeLabel ? `${gradeLabel} ` : ''}실거래가 집계 ${latest.sampleCount}건 기준${formatFxSuffix(latest)}`,
    currency: latest.currency,
    sampleCount: latest.sampleCount,
    sourceUrl: latest.sourceUrl,
    sourceCurrency: latest.sourceCurrency,
    fxRateDate: latest.fxRateDate,
    fxProvider: latest.fxProvider,
  };
}

function snapshotDisplayCurrency(snapshot: CardPriceSnapshotRow): string {
  return snapshot.display_currency ?? snapshot.currency;
}

function snapshotAvgPrice(snapshot: CardPriceSnapshotRow): number | null {
  return snapshot.display_avg_price ?? snapshot.avg_price;
}

function snapshotAvgPriceKrw(snapshot: CardPriceSnapshotRow): number | null {
  if (
    snapshotDisplayCurrency(snapshot) === 'KRW' &&
    snapshot.display_avg_price !== null &&
    snapshot.display_avg_price !== undefined
  ) {
    return snapshot.display_avg_price;
  }
  const sourceAverage = snapshot.source_avg_price ?? snapshot.avg_price;
  if (sourceAverage === null) return null;
  if ((snapshot.source_currency ?? snapshot.currency) === 'KRW') return sourceAverage;
  return snapshot.fx_rate && Number.isFinite(snapshot.fx_rate) && snapshot.fx_rate > 0
    ? sourceAverage * snapshot.fx_rate
    : null;
}

function safeExternalHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatMarketplaceSourceName(sourceName: string): string {
  switch (sourceName) {
    case 'ebay':
    case 'ebay_auction':
      return 'eBay';
    case 'kream':
    case 'manual_kream':
      return 'KREAM';
    case 'bunjang':
    case 'manual_bunjang':
      return '번개장터';
    case 'joongna':
    case 'manual_joongna':
      return '중고나라';
    default:
      return '외부 판매처';
  }
}

export function deriveMarketplaceFallbackLink(
  snapshots: readonly CardPriceSnapshotRow[],
  query: BrowseCardQuery,
): MarketplaceFallbackLink {
  const candidates = snapshots.flatMap((row) => {
    if (!isAskingSnapshot(row) || row.source_name === 'ebay_browse') return [];
    const href = safeExternalHttpUrl(row.source_url);
    return href ? [{ row, href }] : [];
  });

  if (candidates.length > 0) {
    const selectedBucket = pickRichestBucket(candidates.map(({ row }) => row));
    const bucketCandidates = candidates.filter(({ row }) => bucketKey(row) === selectedBucket?.key);
    const latest = latestDate(bucketCandidates.map(({ row }) => row));
    const latestCandidates = bucketCandidates.filter(({ row }) => row.snapshot_date === latest);
    const target =
      latestCandidates.reduce((sum, { row }) => sum + (snapshotAvgPrice(row) ?? 0), 0) /
      latestCandidates.length;
    // Stable order: distance to target, lower comparable price, source, then URL.
    const selected = latestCandidates.sort((a, b) => {
      const aPrice = snapshotAvgPrice(a.row) ?? 0;
      const bPrice = snapshotAvgPrice(b.row) ?? 0;
      return (
        Math.abs(aPrice - target) - Math.abs(bPrice - target) ||
        aPrice - bPrice ||
        a.row.source_name.localeCompare(b.row.source_name) ||
        a.href.localeCompare(b.href)
      );
    })[0];
    const sourceLabel = formatMarketplaceSourceName(selected.row.source_name);
    return {
      kind: 'source',
      href: selected.href,
      sourceLabel,
      actionLabel: `${sourceLabel}에서 보기`,
    };
  }

  return {
    kind: 'search',
    href: buildEbaySearchPageUrl(buildBrowseKeyword(query)),
    sourceLabel: 'eBay',
    actionLabel: 'eBay에서 검색',
  };
}

function snapshotMinPrice(snapshot: CardPriceSnapshotRow): number {
  return snapshot.display_min_price ?? snapshot.min_price ?? snapshotAvgPrice(snapshot) ?? 0;
}

function snapshotMaxPrice(snapshot: CardPriceSnapshotRow): number {
  return snapshot.display_max_price ?? snapshot.max_price ?? snapshotAvgPrice(snapshot) ?? 0;
}

/** Source URL of the cheapest-min row in a date group, so the link tracks 최저가. */
function cheapestSourceUrl(group: readonly CardPriceSnapshotRow[]): string | null {
  const withUrl = group.filter((row) => Boolean(row.source_url) || (row.listings?.length ?? 0) > 0);
  if (withUrl.length === 0) return null;
  const cheapest = withUrl.reduce((cheapest, row) =>
    snapshotMinPrice(row) < snapshotMinPrice(cheapest) ? row : cheapest,
  );
  // Prefer a URL from the filtered `listings` array. The legacy `source_url`
  // column was written before listing-level contamination filtering and can
  // point at an unrelated card (eBay fuzzy-matches the collector number across
  // sets), so trust the filtered listings first and only fall back to it.
  const listings = cheapest.listings ?? [];
  if (listings.length > 0) {
    return (
      listings.reduce((a, b) => (b.price < a.price ? b : a)).url ?? cheapest.source_url ?? null
    );
  }
  return cheapest.source_url ?? null;
}

function pointSourceCurrency(group: readonly CardPriceSnapshotRow[]): string | null {
  const sourceCurrencies = new Set(group.map((row) => row.source_currency ?? row.currency));
  return sourceCurrencies.size === 1 ? Array.from(sourceCurrencies)[0] : null;
}

function latestFxRateDate(group: readonly CardPriceSnapshotRow[]): string | null {
  const latest = group
    .map((row) => row.fx_rate_date)
    .filter((date): date is string => Boolean(date))
    .reduce((latest, date) => (date > latest ? date : latest), '');
  return latest || null;
}

function pointFxProvider(group: readonly CardPriceSnapshotRow[]): string | null {
  const providers = new Set(
    group.map((row) => row.fx_provider).filter((provider): provider is string => Boolean(provider)),
  );
  return providers.size === 1 ? Array.from(providers)[0] : null;
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function formatSourceNames(sourceNames: readonly string[]): string {
  return sourceNames.map(formatSourceName).filter(Boolean).join('/');
}

function formatSourceName(sourceName: string): string {
  switch (sourceName) {
    case 'ebay_browse':
      return 'eBay Browse';
    case 'ebay_sold':
      return 'eBay sold';
    case 'pricecharting_ebay_sold':
      return 'PriceCharting eBay sold';
    case 'manual_kream':
    case 'kream':
      return 'KREAM';
    case 'manual_bunjang':
    case 'bunjang':
      return '번개장터';
    case 'manual_joongna':
    case 'joongna':
      return '중고나라';
    case 'aggregate':
      return '수동 evidence';
    default:
      return sourceName;
  }
}

function askingSourcePrefix(point: PricePoint): string {
  if (point.sourceCurrency && point.sourceCurrency !== point.currency) return 'eBay';
  return point.currency === 'KRW' ? '국내' : 'eBay';
}

function formatFxSuffix(point: PricePoint): string {
  if (!point.fxRateDate || !point.sourceCurrency || point.sourceCurrency === point.currency) {
    return '';
  }
  return ` · ${point.sourceCurrency}->${point.currency} 환율 ${formatSnapshotDate(
    point.fxRateDate,
  )} 기준`;
}

function formatSnapshotDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(parsed);
}

function mapCatalogCardRow(
  row: PokemonCatalogCardRow,
  snapshotsByPrinting?: ReadonlyMap<string, CardPriceSnapshotRow[]>,
): PokemonCatalogCard {
  const printing = selectPrimaryPrinting(row);
  const sampleId = getSampleId(printing);
  const setName =
    row.card_sets?.name_ko ?? row.card_sets?.name ?? printing?.set_name ?? '세트 미상';

  const printingId = printing?.id ?? row.id;
  const snapshots = snapshotsByPrinting?.get(printingId) ?? [];
  // Real snapshot-derived summary; null when the card has no price data, so the
  // UI can show "시세 정보 없음" instead of a fabricated placeholder value.
  const price = derivePriceDisplayFromHistory(buildPriceHistory(snapshots));

  return {
    slug: row.slug,
    name: row.name,
    href: `/cards/${row.slug}`,
    setName,
    setSlug: row.card_sets?.slug ?? 'pokemon',
    rarity: printing?.rarity ?? row.rarity ?? '레어도 미상',
    collectorNumber: printing?.collector_number ?? row.collector_number ?? '번호 미상',
    sampleId,
    imageUrl: selectCatalogCardImage(row, printing),
    price,
    priceSnapshotCount: snapshots.length,
  };
}

function selectCatalogCardImage(
  row: PokemonCatalogCardRow,
  printing: CardPrintingRow | null,
): string | null {
  if (isPokemonKoreaImage(row.thumbnail_url)) return row.thumbnail_url;
  if (isPokemonKoreaImage(printing?.image_url)) return printing?.image_url ?? null;
  if (isPokemonKoreaImage(row.image_url)) return row.image_url;
  return row.thumbnail_url ?? printing?.image_url ?? row.image_url;
}

function isPokemonKoreaImage(url: string | null | undefined): boolean {
  return Boolean(url?.includes('cards.image.pokemonkorea.co.kr'));
}

function deriveAvailableSetsFromCards(cards: readonly PokemonCatalogCard[]): AvailableSetOption[] {
  const seen = new Map<string, string>();
  cards.forEach((card) => {
    if (!seen.has(card.setSlug)) {
      seen.set(card.setSlug, card.setName);
    }
  });
  return Array.from(seen.entries())
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function deriveAvailableRaritiesFromCards(cards: readonly PokemonCatalogCard[]): string[] {
  return Array.from(new Set(cards.map((card) => card.rarity))).sort((a, b) =>
    a.localeCompare(b, 'ko-KR'),
  );
}

function normalizeStringList(list: readonly string[] | undefined): string[] {
  if (!list || list.length === 0) return [];
  return Array.from(new Set(list.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function isSupabasePermissionDenied(message: string): boolean {
  return message.toLowerCase().includes('permission denied');
}

function selectPrimaryPrinting(row: PokemonCatalogCardRow): CardPrintingRow | null {
  return findPrintingForEdition(row, 'kr') ?? row.card_printings[0] ?? null;
}

function selectPrintingForEdition(
  row: PokemonCatalogCardRow,
  edition: CardEdition = 'kr',
): CardPrintingRow | null {
  return findPrintingForEdition(row, edition) ?? selectPrimaryPrinting(row);
}

function findPrintingForEdition(
  row: PokemonCatalogCardRow,
  edition: CardEdition,
): CardPrintingRow | null {
  return row.card_printings.find((printing) => printingMatchesEdition(printing, edition)) ?? null;
}

function printingMatchesEdition(printing: CardPrintingRow, edition: CardEdition): boolean {
  const config = CARD_EDITION_CONFIG[edition];
  if (edition === 'na') {
    return printing.language === config.language && ['NA', 'US'].includes(printing.region);
  }
  return printing.language === config.language && printing.region === config.region;
}

function getPrintingEdition(printing: CardPrintingRow | null): CardEdition | null {
  if (!printing) return null;
  return CARD_EDITION_ORDER.find((edition) => printingMatchesEdition(printing, edition)) ?? null;
}

function buildEditionOptions(
  row: PokemonCatalogCardRow,
  selectedEdition: CardEdition,
): CardEditionOption[] {
  return CARD_EDITION_ORDER.map((edition) => {
    const printing = findPrintingForEdition(row, edition);
    const config = CARD_EDITION_CONFIG[edition];
    return {
      value: edition,
      label: config.label,
      shortLabel: config.shortLabel,
      isSelected: edition === selectedEdition,
      isAvailable: Boolean(printing),
      printingId: printing?.id ?? null,
    };
  });
}

export function parseCardEdition(value: string | string[] | undefined): CardEdition {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'jp' || raw === 'na') return raw;
  return 'kr';
}

function getSampleId(printing: CardPrintingRow | null): string {
  const cardNum = printing?.external_ids?.card_num;
  if (typeof cardNum === 'string' && cardNum.length > 0) return `PKMKR-${cardNum}`;

  const setCode = printing?.set_code;
  if (typeof setCode === 'string' && /^BS\d+$/.test(setCode)) return `PKMKR-${setCode}`;

  const sampleId = printing?.external_ids?.sample_id;
  return typeof sampleId === 'string' && sampleId.length > 0 ? sampleId : 'PKMKR-UNKNOWN';
}

function getExternalString(printing: CardPrintingRow | null, key: string): string | null {
  const value = printing?.external_ids?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getChangeTone(rate: number): ChangeTone {
  if (rate > 0) return 'up';
  if (rate < 0) return 'down';
  return 'flat';
}

function getCategoryOverviewStatus(
  cardCount: number,
  priceSnapshotCount: number,
): TcgCategoryOverview['status'] {
  if (cardCount === 0) return 'empty';
  if (priceSnapshotCount > 0) return 'live';
  return 'catalog-only';
}

function getCategoryOverviewStatusLabel(status: TcgCategoryOverview['status']): string {
  if (status === 'live') return '가격 추적 중';
  if (status === 'catalog-only') return '카탈로그 연결';
  return '준비 중';
}

async function countRowsByGameId(
  supabase: SupabaseClient,
  table: 'cards' | 'card_sets',
  gameIds: readonly string[],
): Promise<GameCountRow[]> {
  return Promise.all(
    gameIds.map(async (gameId) => {
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('game_id', gameId);

      throwIfSupabaseError(error);
      return { game_id: gameId, count: count ?? 0 };
    }),
  );
}

function applyExactCounts(
  target: Map<string, number>,
  exactCounts: readonly GameCountRow[] | undefined,
) {
  if (!exactCounts) return;
  for (const row of exactCounts) {
    target.set(row.game_id, row.count);
  }
}

function stableHash(value: string): number {
  return Array.from(value).reduce((hash, character) => hash + character.charCodeAt(0), 0);
}

function roundToNearest(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

function throwIfSupabaseError(error: SupabaseErrorLike | null) {
  if (error) {
    throw new Error(`Supabase catalog query failed: ${error.message}`);
  }
}

function isMissingDisplayPriceColumn(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  const mentionsDisplayColumn =
    normalizedMessage.includes('display_currency') ||
    normalizedMessage.includes('source_currency') ||
    normalizedMessage.includes('fx_rate');
  return (
    mentionsDisplayColumn &&
    (normalizedMessage.includes('schema cache') ||
      normalizedMessage.includes('does not exist') ||
      normalizedMessage.includes('could not find'))
  );
}
