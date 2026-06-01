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
}

/** A single dated price point for the detail chart. */
export interface PricePoint {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sampleCount: number;
  currency: string;
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
  price: PriceDisplay;
}

export interface AvailableSetOption {
  slug: string;
  name: string;
}

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
}

export interface MapPokemonCategoryOptions {
  availableSets?: AvailableSetOption[];
  availableRarities?: string[];
  selectedRarities?: string[];
  selectedSetSlugs?: string[];
  query?: string;
}

export async function getPokemonCategoryPageData(
  options: PokemonCategoryQueryOptions = {},
): Promise<PokemonCategoryPageData | null> {
  const { client, query = '', rarities, setSlugs } = options;
  const supabase = client ?? (await createClient());
  const trimmedQuery = query.trim();
  const selectedRarities = normalizeStringList(rarities);
  const selectedSetSlugs = normalizeStringList(setSlugs);

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
  };

  let setIdsForFilter: string[] | null = null;
  if (selectedSetSlugs.length > 0) {
    setIdsForFilter = allSets
      .filter((row) => selectedSetSlugs.includes(row.slug))
      .map((row) => row.id);
    if (setIdsForFilter.length === 0) {
      return mapPokemonCategoryPageData(game, [], baseMapOptions);
    }
  }

  let cardQuery = supabase
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
        'card_sets(slug, name, name_ko)',
        'card_printings(id, language, region, set_name, set_code, collector_number, rarity, finish, image_url, external_ids)',
      ].join(', '),
    )
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

  const { data: cardData, error: cardError } = await cardQuery.order('slug', { ascending: true });

  throwIfSupabaseError(cardError);

  return mapPokemonCategoryPageData(
    game,
    (cardData ?? []) as unknown as PokemonCatalogCardRow[],
    baseMapOptions,
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
    .select(
      [
        'id',
        'slug',
        'name',
        'collector_number',
        'rarity',
        'image_url',
        'thumbnail_url',
        'card_sets(slug, name, name_ko)',
        'card_printings(id, language, region, set_name, set_code, collector_number, rarity, finish, image_url, external_ids)',
      ].join(', '),
    )
    .eq('game_id', game.id)
    .order('slug', { ascending: true });

  throwIfSupabaseError(cardError);

  const rows = (cardData ?? []) as unknown as PokemonCatalogCardRow[];
  return selectFeaturedPokemonCards(rows.map(mapCatalogCardRow), limit);
}

export function selectFeaturedPokemonCards(
  cards: readonly PokemonCatalogCard[],
  limit = 8,
): PokemonCatalogCard[] {
  return cards.filter((card) => card.imageUrl !== null && card.imageUrl !== '').slice(0, limit);
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
    .eq('slug', slug)
    .maybeSingle();

  throwIfSupabaseError(error);

  if (!data) return null;

  const detailRow = data as unknown as CardDetailRow;
  const printing = selectPrimaryPrinting(detailRow);
  const printingId = printing?.id ?? detailRow.id;

  const { data: snapshotData, error: snapshotError } = await supabase
    .from('card_price_snapshots')
    .select(
      'snapshot_date, market, currency, variant, condition_label, source_name, avg_price, min_price, max_price, sample_count, grade_company, grade_value',
    )
    .eq('card_printing_id', printingId)
    .order('snapshot_date', { ascending: true });

  throwIfSupabaseError(snapshotError);

  return mapCardDetailRow(detailRow, (snapshotData ?? []) as CardPriceSnapshotRow[]);
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

export function mapPokemonCategoryPageData(
  game: TcgGameRow,
  rows: readonly PokemonCatalogCardRow[],
  options: MapPokemonCategoryOptions = {},
): PokemonCategoryPageData {
  const cards = rows.map(mapCatalogCardRow);

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
  };
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
  const priced = snapshots.filter((snapshot) => snapshot.avg_price !== null);
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
    snapshot.currency,
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
    const avg =
      group.reduce((sum, row) => sum + (row.avg_price ?? 0), 0) / group.length;
    points.push({
      date,
      avgPrice: Math.round(avg * 100) / 100,
      minPrice: Math.min(...group.map((row) => row.min_price ?? row.avg_price ?? 0)),
      maxPrice: Math.max(...group.map((row) => row.max_price ?? row.avg_price ?? 0)),
      sampleCount: group.reduce((sum, row) => sum + (row.sample_count ?? 0), 0),
      currency: group[0].currency,
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
      ? `${latest.currency === 'KRW' ? '국내' : 'eBay'} 판매중 호가 ${latest.sampleCount}건 기준 (실거래가는 참조점으로 표시)`
      : `최근 ${history.gradeLabel ? `${history.gradeLabel} ` : ''}실거래가 집계 ${latest.sampleCount}건 기준`,
    currency: latest.currency,
    sampleCount: latest.sampleCount,
  };
}

function formatSnapshotDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(parsed);
}

function mapCatalogCardRow(row: PokemonCatalogCardRow): PokemonCatalogCard {
  const printing = selectPrimaryPrinting(row);
  const sampleId = getSampleId(printing);
  const setName =
    row.card_sets?.name_ko ?? row.card_sets?.name ?? printing?.set_name ?? '세트 미상';

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
    price: createDeterministicPriceDisplay(row.slug, sampleId),
  };
}

function deriveAvailableSetsFromCards(
  cards: readonly PokemonCatalogCard[],
): AvailableSetOption[] {
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
  return Array.from(
    new Set(list.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
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
