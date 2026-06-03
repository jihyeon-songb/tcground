import { createClient } from '@/lib/supabase/server';
import { isAskingSource } from './pricing/price-source.types';

type ChangeTone = 'up' | 'down' | 'flat';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

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
  sourceLabel: string;
  currency: string;
  sampleCount: number;
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
  sourceCurrency?: string | null;
  fxRateDate?: string | null;
  fxProvider?: string | null;
}

/**
 * Price history for the detail chart. `askingSeries` is the daily eBay Browse
 * asking trend; `soldPoints` are aggregated sold observations overlaid as
 * reference points. `gradeLabel` names the grade of the trend series when it is
 * a graded fallback (e.g. KREAM PSA 10 체결가), and is null when the trend is raw.
 */
export interface PriceHistory {
  askingSeries: PricePoint[];
  soldPoints: PricePoint[];
  currency: string | null;
  gradeLabel: string | null;
  hasData: boolean;
}

interface CardPriceSnapshotRow {
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
  condition_label?: string | null;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  sample_count: number | null;
  grade_company?: string | null;
  grade_value?: string | null;
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
}

export interface AvailableSetOption {
  slug: string;
  name: string;
}

export type PokemonSort = 'best' | 'name-asc' | 'name-desc';

export const DEFAULT_POKEMON_PAGE_SIZE = 24;
const BEST_SORT_FETCH_CHUNK_SIZE = 500;
const SNAPSHOT_FETCH_CHUNK_SIZE = 100;

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
  printing: {
    id: string;
    language: string;
    region: string;
    setCode: string;
    collectorNumber: string;
    finish: string;
    sampleId: string;
  };
  priceHistory: PriceHistory;
  backHref: string;
  backLabel: string;
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

const PRICE_SNAPSHOT_SELECT_WITH_DISPLAY =
  'snapshot_date, market, currency, source_currency, source_avg_price, source_min_price, source_max_price, display_currency, display_avg_price, display_min_price, display_max_price, fx_rate, fx_rate_date, fx_provider, variant, condition_label, source_name, avg_price, min_price, max_price, sample_count, grade_company, grade_value';

const PRICE_SNAPSHOT_SELECT_LEGACY =
  'snapshot_date, market, currency, variant, condition_label, source_name, avg_price, min_price, max_price, sample_count, grade_company, grade_value';

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
  const supabase = options.client ?? (await createClient());

  const gameResult = await supabase
    .from('tcg_games')
    .select('id, slug, name, name_ko, description')
    .order('display_order', { ascending: true });

  throwIfSupabaseError(gameResult.error);

  const games = (gameResult.data ?? []) as TcgCategoryOverviewGameRow[];
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
  printings,
  snapshots,
}: {
  games: readonly TcgCategoryOverviewGameRow[];
  cards: readonly CardGameCountRow[];
  sets: readonly CardSetGameCountRow[];
  cardCounts?: readonly GameCountRow[];
  setCounts?: readonly GameCountRow[];
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
  const {
    client,
    query = '',
    rarities,
    setSlugs,
    page = 1,
    pageSize = DEFAULT_POKEMON_PAGE_SIZE,
    sort = 'best',
  } = options;
  const supabase = client ?? (await createClient());
  const trimmedQuery = query.trim();
  const selectedRarities = normalizeStringList(rarities);
  const selectedSetSlugs = normalizeStringList(setSlugs);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_POKEMON_PAGE_SIZE;
  const rangeFrom = (safePage - 1) * safePageSize;
  const rangeTo = rangeFrom + safePageSize - 1;

  const { data: gameData, error: gameError } = await supabase
    .from('tcg_games')
    .select('id, slug, name, name_ko, description')
    .eq('slug', 'pokemon')
    .maybeSingle();

  throwIfSupabaseError(gameError);

  const game = gameData as TcgGameRow | null;
  if (!game) return null;

  const { data: setRows, error: setError } = await supabase
    .from('card_sets')
    .select('id, slug, name, name_ko')
    .eq('game_id', game.id)
    .order('slug', { ascending: true });

  throwIfSupabaseError(setError);

  const allSets = (setRows ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    name_ko: string | null;
  }>;
  const availableSets: AvailableSetOption[] = allSets.map((row) => ({
    slug: row.slug,
    name: row.name_ko ?? row.name,
  }));

  const { data: rarityRows, error: rarityError } = await supabase
    .from('cards')
    .select('rarity')
    .eq('game_id', game.id)
    .not('rarity', 'is', null);

  throwIfSupabaseError(rarityError);

  const availableRarities = Array.from(
    new Set(
      ((rarityRows ?? []) as Array<{ rarity: string | null }>)
        .map((row) => row.rarity)
        .filter((rarity): rarity is string => Boolean(rarity)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'ko-KR'));

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

  const buildCardQuery = () => {
    let cardQuery = supabase
      .from('cards')
      .select(POKEMON_CARD_LIST_SELECT, { count: 'exact' })
      .eq('game_id', game.id);

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
    const cardRows: PokemonCatalogCardRow[] = [];
    let totalCount = 0;

    for (let rangeStart = 0; ; rangeStart += BEST_SORT_FETCH_CHUNK_SIZE) {
      const rangeEnd = rangeStart + BEST_SORT_FETCH_CHUNK_SIZE - 1;
      const { data: chunkData, error: chunkError, count } = await buildCardQuery()
        .order('slug', { ascending: true })
        .range(rangeStart, rangeEnd);

      throwIfSupabaseError(chunkError);

      const chunkRows = (chunkData ?? []) as unknown as PokemonCatalogCardRow[];
      if (rangeStart === 0) totalCount = count ?? chunkRows.length;
      cardRows.push(...chunkRows);

      if (chunkRows.length === 0 || cardRows.length >= totalCount) break;
    }

    const snapshotsByPrinting = await fetchSnapshotsByPrinting(
      supabase,
      collectPrimaryPrintingIds(cardRows),
    );
    const data = mapPokemonCategoryPageData(
      game,
      cardRows,
      { ...baseMapOptions, totalCount: totalCount || cardRows.length },
      snapshotsByPrinting,
    );

    return {
      ...data,
      cards: data.cards.slice(rangeFrom, rangeTo + 1),
    };
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

export interface FeaturedPokemonCardsOptions {
  client?: SupabaseClient;
  limit?: number;
}

export async function getFeaturedPokemonCards(
  options: FeaturedPokemonCardsOptions = {},
): Promise<PokemonCatalogCard[]> {
  const { client, limit = 8 } = options;
  const supabase = client ?? (await createClient());

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
  // Pick the featured subset first (image filter + limit), then load prices only
  // for those few printings instead of the whole catalog.
  const featured = selectFeaturedPokemonCards(
    rows.map((row) => mapCatalogCardRow(row)),
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
): Promise<CatalogCardDetail | null> {
  const supabase = client ?? (await createClient());

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
  const printing = selectPrimaryPrinting(detailRow);
  const printingId = printing?.id ?? detailRow.id;

  const snapshotData = await fetchSnapshotRowsForPrinting(supabase, printingId);

  return mapCardDetailRow(detailRow, snapshotData);
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

async function fetchSnapshotRowsForPrintings(
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
  const aHasPrice = a.price !== null;
  const bHasPrice = b.price !== null;
  if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;

  const sampleDelta = (b.price?.sampleCount ?? 0) - (a.price?.sampleCount ?? 0);
  if (sampleDelta !== 0) return sampleDelta;

  return a.slug.localeCompare(b.slug);
}

export function mapCardDetailRow(
  row: CardDetailRow,
  snapshots: readonly CardPriceSnapshotRow[] = [],
): CatalogCardDetail {
  const printing = selectPrimaryPrinting(row);
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
    priceHistory,
    printing: {
      id: printing?.id ?? row.id,
      language: printing?.language ?? 'ko',
      region: printing?.region ?? 'KR',
      setCode: printing?.set_code ?? 'unknown',
      collectorNumber,
      finish: printing?.finish ?? 'unknown',
      sampleId,
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
    sourceLabel: '가격 데이터 연결 전까지 카탈로그 대표값을 표시합니다.',
    currency: 'KRW',
    sampleCount: 0,
  };
}

/**
 * Builds the detail chart history from snapshots. Snapshots mix currencies,
 * variants, conditions, grades and markets, so we never draw them all as one
 * line. Instead we pick a single coherent bucket — same currency, variant and
 * grade — and draw that as the trend. The eBay Browse asking series is
 * preferred; otherwise the richest sold bucket forms the line, with comparable
 * sold points overlaid only when an asking trend is present.
 *
 * Raw (ungraded) buckets are preferred so the trend axis stays on comparable
 * prices. Graded sold data (e.g. KREAM PSA 10 체결가) only forms the trend as a
 * fallback when no raw data exists — in that case `gradeLabel` records the grade
 * so the UI can tell the user which grade the chart is showing.
 */
export function buildPriceHistory(snapshots: readonly CardPriceSnapshotRow[]): PriceHistory {
  const priced = snapshots.filter((snapshot) => snapshotAvgPrice(snapshot) !== null);
  // Asking sources (eBay Browse, 번개장터) form the trend line; sold sources
  // (eBay sold, KREAM 체결, manual sold imports) form the overlay/sold series.
  const askingRows = priced.filter((snapshot) => isAskingSource(snapshot.source_name));
  const soldRows = priced.filter((snapshot) => !isAskingSource(snapshot.source_name));

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
 * Identifies a coherent, comparable bucket: one currency + variant + grade.
 * Market and condition are allowed to vary (and same-date rows are averaged in
 * `collapseByDate`) so the trend stays continuous instead of fragmenting into
 * single points. Grade is part of the key so a graded series (e.g. PSA 10) never
 * mixes with raw prices on the same line.
 */
function bucketKey(snapshot: CardPriceSnapshotRow): string {
  return [
    snapshotDisplayCurrency(snapshot),
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
      sourceCurrency: pointSourceCurrency(group),
      fxRateDate: latestFxRateDate(group),
      fxProvider: pointFxProvider(group),
    });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

/** Derives the price summary from the trend series, or null when there is none. */
export function derivePriceDisplayFromHistory(history: PriceHistory): PriceDisplay | null {
  const usingAsking = history.askingSeries.length > 0;
  const series = getPriceTrendSeries(history);
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
    sourceLabel: usingAsking
      ? `${askingSourcePrefix(latest)} 판매중 호가 ${latest.sampleCount}건 기준 (실거래가는 참조점으로 표시)${formatFxSuffix(latest)}`
      : `최근 ${history.gradeLabel ? `${history.gradeLabel} ` : ''}실거래가 집계 ${latest.sampleCount}건 기준${formatFxSuffix(latest)}`,
    currency: latest.currency,
    sampleCount: latest.sampleCount,
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

function snapshotMinPrice(snapshot: CardPriceSnapshotRow): number {
  return snapshot.display_min_price ?? snapshot.min_price ?? snapshotAvgPrice(snapshot) ?? 0;
}

function snapshotMaxPrice(snapshot: CardPriceSnapshotRow): number {
  return snapshot.display_max_price ?? snapshot.max_price ?? snapshotAvgPrice(snapshot) ?? 0;
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
    imageUrl: row.thumbnail_url ?? printing?.image_url ?? row.image_url,
    price,
  };
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

function selectPrimaryPrinting(row: PokemonCatalogCardRow): CardPrintingRow | null {
  return (
    row.card_printings.find((printing) => printing.language === 'ko' && printing.region === 'KR') ??
    row.card_printings[0] ??
    null
  );
}

function getSampleId(printing: CardPrintingRow | null): string {
  const sampleId = printing?.external_ids?.sample_id;
  return typeof sampleId === 'string' && sampleId.length > 0 ? sampleId : 'KR-000';
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
