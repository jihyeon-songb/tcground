/**
 * TCGdex → Supabase card catalog import (pure mapping + thin fetch).
 *
 * Fetches a Pokémon set and its cards from the public TCGdex REST API and maps
 * them onto our `card_sets` / `cards` / `card_printings` rows. The mapping
 * functions are pure so they can be unit-tested without the network; only
 * `fetchTcgdexSet` performs IO.
 *
 * Korean coverage on TCGdex is partial: `/ko/sets/{id}` often exists as a shell
 * while the card rows/images live on `/ja` or `/en`. We resolve along a locale
 * fallback chain and record the locale actually used in
 * `card_printings.external_ids` (`tcgdex_locale`, `tcgdex_match_basis`) so a
 * later pass can upgrade to true Korean assets without guessing.
 */

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';

/** Locale → (language, region) used for the representative printing. */
const LOCALE_PRINTING: Record<string, { language: string; region: string }> = {
  ko: { language: 'ko', region: 'KR' },
  ja: { language: 'ja', region: 'JP' },
  en: { language: 'en', region: 'NA' },
};

export const DEFAULT_LOCALE_CHAIN = ['ko', 'ja', 'en'] as const;

/** Brief card shape returned inside a TCGdex set response. */
export interface TcgdexCardBrief {
  id: string;
  localId: string;
  name: string;
  /** Asset base URL without extension/quality, e.g. `.../SV2a/201`. May be absent. */
  image?: string;
  rarity?: string;
}

/** Set shape returned by `/v2/{lang}/sets/{setId}`. */
export interface TcgdexSet {
  id: string;
  name: string;
  releaseDate?: string;
  cardCount?: { official?: number; total?: number };
  cards: TcgdexCardBrief[];
}

/** A set fetched together with the locale that actually resolved it. */
export interface ResolvedTcgdexSet {
  set: TcgdexSet;
  locale: string;
  /** Locales tried before `locale` resolved. */
  attempted: string[];
}

export interface CardSetRowInput {
  game_id: string;
  slug: string;
  name: string;
  name_ko: string | null;
  released_on: string | null;
  card_count: number | null;
}

export interface CardRowInput {
  game_id: string;
  set_id: string;
  slug: string;
  name: string;
  normalized_name: string;
  collector_number: string;
  rarity: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
}

export interface CardPrintingRowInput {
  // card_id is resolved after the card upsert; carried via the card slug here.
  card_slug: string;
  language: string;
  region: string;
  set_name: string;
  set_code: string;
  collector_number: string;
  rarity: string | null;
  finish: string;
  image_url: string | null;
  external_ids: Record<string, unknown>;
}

export interface MappedCard {
  card: CardRowInput;
  printing: CardPrintingRowInput;
}

/**
 * Lowercases, strips diacritics/symbols, and collapses whitespace to hyphens.
 * Used for both the URL slug and the search `normalized_name` (the latter keeps
 * spaces instead of hyphens).
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Deterministic, unique-per-printing slug: `{setId}-{localId}-{slugified name}`. */
export function buildCardSlug(name: string, setId: string, localId: string): string {
  const base = `${setId}-${localId}-${normalizeName(name).replace(/\s+/g, '-')}`;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** TCGdex image base → full asset URL at the given quality. */
export function tcgdexImageUrl(
  image: string | undefined,
  quality: 'high' | 'low',
  extension = 'webp',
): string | null {
  if (!image) return null;
  return `${image}/${quality}.${extension}`;
}

/** Maps a TCGdex set onto a `card_sets` upsert row. */
export function mapSetToRow(set: TcgdexSet, locale: string, gameId: string): CardSetRowInput {
  const count = set.cardCount?.official ?? set.cardCount?.total ?? set.cards.length;
  return {
    game_id: gameId,
    slug: set.id.toLowerCase(),
    name: set.name,
    name_ko: locale === 'ko' ? set.name : null,
    released_on: set.releaseDate ? normalizeDate(set.releaseDate) : null,
    card_count: count > 0 ? count : null,
  };
}

/** Maps a TCGdex card brief onto `cards` + `card_printings` row inputs. */
export function mapCardToRows(
  card: TcgdexCardBrief,
  context: { gameId: string; setId: string; setName: string; locale: string },
): MappedCard {
  const { gameId, setId, setName, locale } = context;
  const slug = buildCardSlug(card.name, setId, card.localId);
  const printingLocale = LOCALE_PRINTING[locale] ?? LOCALE_PRINTING.en;
  const rarity = card.rarity ?? null;

  return {
    card: {
      game_id: gameId,
      set_id: setId,
      slug,
      name: card.name,
      normalized_name: normalizeName(card.name),
      collector_number: card.localId,
      rarity,
      image_url: tcgdexImageUrl(card.image, 'high'),
      thumbnail_url: tcgdexImageUrl(card.image, 'low'),
    },
    printing: {
      card_slug: slug,
      language: printingLocale.language,
      region: printingLocale.region,
      set_name: setName,
      set_code: setId,
      collector_number: card.localId,
      rarity,
      finish: 'unknown',
      image_url: tcgdexImageUrl(card.image, 'high'),
      external_ids: {
        tcgdex_id: card.id,
        tcgdex_locale: locale,
        tcgdex_match_basis: locale === 'ko' ? 'native' : 'original_equivalent',
      },
    },
  };
}

/**
 * Fetches a set along the locale fallback chain, returning the first locale
 * whose response includes card rows. Throws if every locale fails.
 */
export async function fetchTcgdexSet(
  setId: string,
  localeChain: readonly string[] = DEFAULT_LOCALE_CHAIN,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolvedTcgdexSet> {
  const attempted: string[] = [];
  let lastError = '';

  for (const locale of localeChain) {
    attempted.push(locale);
    const url = `${TCGDEX_BASE_URL}/${locale}/sets/${setId}`;
    const response = await fetchImpl(url);

    if (!response.ok) {
      lastError = `${locale}: HTTP ${response.status}`;
      continue;
    }

    const set = (await response.json()) as TcgdexSet;
    if (Array.isArray(set.cards) && set.cards.length > 0) {
      return { set, locale, attempted: attempted.slice(0, -1) };
    }
    lastError = `${locale}: set shell had no cards`;
  }

  throw new Error(
    `TCGdex set "${setId}" not resolvable via [${localeChain.join(', ')}] — ${lastError}`,
  );
}

/** Normalizes a TCGdex date (`YYYY-MM-DD` or `YYYY/MM/DD`) to ISO `YYYY-MM-DD`. */
function normalizeDate(value: string): string | null {
  const match = value.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}
