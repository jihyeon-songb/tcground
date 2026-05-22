import { createClient } from '@/lib/supabase/server';

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

export interface PokemonSetSummary {
  slug: string;
  name: string;
  href: string;
  cardCount: number;
}

export interface PokemonCategoryPageData {
  gameName: string;
  gameNameKo: string;
  description: string;
  sets: PokemonSetSummary[];
  cards: PokemonCatalogCard[];
}

export interface CatalogCardDetail {
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
  backHref: string;
  backLabel: string;
}

export async function getPokemonCategoryPageData(
  client?: SupabaseClient,
): Promise<PokemonCategoryPageData | null> {
  const supabase = client ?? (await createClient());

  const { data: gameData, error: gameError } = await supabase
    .from('tcg_games')
    .select('id, slug, name, name_ko, description')
    .eq('slug', 'pokemon')
    .maybeSingle();

  throwIfSupabaseError(gameError);

  const game = gameData as TcgGameRow | null;
  if (!game) return null;

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

  return mapPokemonCategoryPageData(game, (cardData ?? []) as unknown as PokemonCatalogCardRow[]);
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
  return mapCardDetailRow(data as unknown as CardDetailRow);
}

export function mapPokemonCategoryPageData(
  game: TcgGameRow,
  rows: readonly PokemonCatalogCardRow[],
): PokemonCategoryPageData {
  const cards = rows.map(mapCatalogCardRow);
  const sets = new Map<string, PokemonSetSummary>();

  cards.forEach((card) => {
    const setSlug = card.setSlug;
    const current = sets.get(setSlug);

    if (current) {
      sets.set(setSlug, {
        ...current,
        cardCount: current.cardCount + 1,
      });
      return;
    }

    sets.set(setSlug, {
      slug: setSlug,
      name: card.setName,
      href: `/categories/pokemon/${setSlug}`,
      cardCount: 1,
    });
  });

  return {
    gameName: game.name,
    gameNameKo: game.name_ko ?? game.name,
    description:
      game.description ?? '포켓몬 카드의 대표 한국판 카탈로그를 세트와 레어도 기준으로 탐색하세요.',
    sets: Array.from(sets.values()).sort((a, b) => a.slug.localeCompare(b.slug)),
    cards,
  };
}

export function mapCardDetailRow(row: CardDetailRow): CatalogCardDetail {
  const printing = selectPrimaryPrinting(row);
  const sampleId = getSampleId(printing);
  const setLabel =
    row.card_sets?.name_ko ?? row.card_sets?.name ?? printing?.set_name ?? '세트 미상';
  const collectorNumber = printing?.collector_number ?? row.collector_number ?? '번호 미상';
  const rarity = printing?.rarity ?? row.rarity ?? '레어도 미상';
  const gameName = row.tcg_games?.name_ko ?? row.tcg_games?.name ?? 'Pokemon TCG';

  return {
    slug: row.slug,
    metaTitle: `TCGround | ${row.name} - ${setLabel}`,
    metaDescription: `${setLabel} ${row.name} 카드의 세트, 레어도, 번호와 가격 요약을 확인하세요.`,
    chips: [gameName, setLabel, rarity, collectorNumber],
    cardName: row.name,
    setLabel,
    collectorNumber,
    rarity,
    imageUrl: printing?.image_url ?? row.image_url,
    price: createDeterministicPriceDisplay(row.slug, sampleId),
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
  };
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
    imageUrl: printing?.image_url ?? row.thumbnail_url ?? row.image_url,
    price: createDeterministicPriceDisplay(row.slug, sampleId),
  };
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
