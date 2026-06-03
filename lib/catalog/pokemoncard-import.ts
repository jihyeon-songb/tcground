/**
 * pokemoncard.co.kr (official Korean Pokémon TCG site) → Supabase catalog import.
 *
 * The official site is the authoritative source for Korean card names, sets,
 * collector numbers and rarities — TCGdex has almost no Korean card-level data
 * (its `/ko` set/card endpoints are empty shells), so it cannot back a Korean
 * catalog. Card *facts* (names, numbers, rarities) are not copyrightable and are
 * read per set here; card *artwork* is the official watermarked image hotlinked
 * straight from the public CDN (cards.image.pokemonkorea.co.kr) — never copied
 * or de-watermarked, so the rights holder's attribution stays intact.
 *
 * Protocol (reverse-engineered; stateless — no session/cookie needed, only the
 * `X-Requested-With: XMLHttpRequest` header that the site's own XHR sends):
 *
 *   POST /v2/ajax2_dev2  (multipart/form-data)
 *     action=get_more_cards, GoodsName=<Korean set name>, CardTypeNum=<1|2|3>,
 *     limit=<page index, 0-based>, plus the range filters the form always sends
 *     (CardMonType/Weakness/Resistance/TechErg=<all types>, hp=0,380, retreat=0,5,
 *      order=DESC, orderby=order_num).
 *   → JSON { count, limit, result: { "1": {CardNum, feature_image}, … } }
 *     The server paginates with `LIMIT page*30, 30`; `count < 30` marks the last
 *     page. CardTypeNum groups are 1=Pokémon, 2=Trainer, 3=Energy, so all three
 *     must be swept to cover a full set.
 *
 *   GET /cards/detail/{CardNum}  → HTML; `parseCardDetail` lifts the Korean name,
 *     collector number ("104/095"), rarity ("SR") and image path from it.
 *
 * The mapping/parse functions are pure (unit-testable without the network); only
 * the `fetch*` functions perform IO.
 */

import { buildCardSlug, normalizeName } from './tcgdex-import';
import type { CardPrintingRowInput, CardRowInput, CardSetRowInput } from './tcgdex-import';

const BASE_URL = 'https://pokemoncard.co.kr';
const AJAX_PATH = '/v2/ajax2_dev2';
const IMAGE_CDN = 'https://cards.image.pokemonkorea.co.kr/data';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** All type chips the search form sends to mean "no type restriction". */
const ALL_TYPES = '풀,불꽃,물,번개,초,격투,악,강철,페어리,드래곤,무색,all';
/** Server page size for `get_more_cards` (rows per page; fewer marks the end). */
const PAGE_SIZE = 30;
/** CardTypeNum groups: 1=Pokémon, 2=Trainer, 3=Energy. Sweep all for a full set. */
const CARD_TYPE_NUMS = [1, 2, 3] as const;

/** A card reference from the set listing, before its detail page is fetched. */
export interface CardRef {
  cardNum: string;
  /** Relative image path, e.g. `wmimages/SM/SM10/SM10_104.png`. */
  featureImage: string;
}

/** The Korean fields lifted from a `/cards/detail/{CardNum}` page. */
export interface ParsedCard {
  cardNum: string;
  name: string;
  /** As printed, e.g. `104/095`. */
  collectorNumber: string;
  /** Rarity code as shown (e.g. `C`, `R`, `SR`), or null when absent. */
  rarity: string | null;
  /** Set code from the image path, e.g. `SM10`, or null when not derivable. */
  setCode: string | null;
  /** Relative image path used to build the public CDN URL. */
  featureImage: string | null;
}

export interface MappedCard {
  card: CardRowInput;
  printing: CardPrintingRowInput;
}

/** Builds the full watermarked CDN image URL at the given render width. */
export function imageUrlFor(featureImage: string | null, width: number): string | null {
  if (!featureImage) return null;
  const rel = featureImage.replace(/^\/+/, '').split('?')[0];
  return `${IMAGE_CDN}/${rel}?w=${width}`;
}

/** Builds the multipart body for one `get_more_cards` page request. Pure. */
export function buildSearchForm(goodsName: string, cardTypeNum: number, page: number): FormData {
  const form = new FormData();
  form.append('action', 'get_more_cards');
  form.append('limit', String(page));
  form.append('GoodsName', goodsName);
  form.append('CardTypeNum', String(cardTypeNum));
  form.append('CardType', '');
  form.append('CardMonType', ALL_TYPES);
  form.append('Weakness', ALL_TYPES);
  form.append('Resistance', ALL_TYPES);
  form.append('TechErg', ALL_TYPES);
  form.append('ability_label1', '');
  form.append('hp', '0,380');
  form.append('retreat', '0,5');
  form.append('order', 'DESC');
  form.append('orderby', 'order_num');
  return form;
}

interface AjaxResponse {
  count?: number;
  limit?: number;
  result?: Record<string, { CardNum?: string; feature_image?: string }>;
}

/**
 * Parses an `ajax2_dev2` JSON body. The endpoint can emit PHP notices before the
 * JSON when fed unexpected input, so we start parsing at the first brace.
 */
export function parseAjaxResponse(body: string): AjaxResponse {
  const start = body.indexOf('{');
  if (start < 0) throw new Error(`Unexpected ajax2_dev2 body: ${body.slice(0, 120)}`);
  return JSON.parse(body.slice(start)) as AjaxResponse;
}

/** Extracts ordered card refs from one ajax page (object keyed "1","2",…). */
export function extractCardRefs(response: AjaxResponse): CardRef[] {
  return Object.values(response.result ?? {})
    .filter((row): row is { CardNum: string; feature_image?: string } => Boolean(row?.CardNum))
    .map((row) => ({ cardNum: row.CardNum, featureImage: row.feature_image ?? '' }));
}

/**
 * Lists every card ref in a set by sweeping all three CardTypeNum groups and
 * paginating each until a short page is returned. De-duplicates by CardNum.
 */
export async function fetchSetCardRefs(
  goodsName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CardRef[]> {
  const refs: CardRef[] = [];
  const seen = new Set<string>();

  for (const cardTypeNum of CARD_TYPE_NUMS) {
    for (let page = 0; ; page += 1) {
      const response = await fetchImpl(`${BASE_URL}${AJAX_PATH}`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': USER_AGENT,
          Referer: `${BASE_URL}/cards`,
        },
        body: buildSearchForm(goodsName, cardTypeNum, page),
      });
      if (!response.ok) {
        throw new Error(`ajax2_dev2 failed (${response.status}) for "${goodsName}"`);
      }

      const parsed = parseAjaxResponse(await response.text());
      for (const ref of extractCardRefs(parsed)) {
        if (!seen.has(ref.cardNum)) {
          seen.add(ref.cardNum);
          refs.push(ref);
        }
      }
      if ((parsed.count ?? 0) < PAGE_SIZE) break;
    }
  }

  return refs;
}

/** Lifts the Korean card fields from a detail page's HTML. Pure. */
export function parseCardDetail(html: string, cardNum: string): ParsedCard | null {
  const name = html.match(/<span class="card-hp title">([^<]*)<\/span>/)?.[1]?.trim();
  if (!name) return null;

  const pnum = html.match(
    /<span class="p_num">([^<]*?)(?:<span id="no_wrap_by_admin">\s*([^<]*?)\s*<\/span>)?\s*<\/span>/,
  );
  const collectorNumber = pnum?.[1]?.trim() ?? '';
  const rarity = pnum?.[2]?.trim() || null;

  const featureImage = html.match(/data\/(wmimages\/[^"?]+)/)?.[1] ?? null;
  const setCode = featureImage ? (featureImage.split('/')[2] ?? null) : null;

  return { cardNum, name, collectorNumber, rarity, setCode, featureImage };
}

/** Fetches and parses one card's detail page. */
export async function fetchCardDetail(
  cardNum: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ParsedCard | null> {
  const response = await fetchImpl(`${BASE_URL}/cards/detail/${cardNum}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`detail fetch failed (${response.status}) for ${cardNum}`);
  }
  return parseCardDetail(await response.text(), cardNum);
}

/** Maps a Korean set name + code onto a `card_sets` upsert row. */
export function mapSetToRow(goodsName: string, setCode: string, gameId: string): CardSetRowInput {
  return {
    game_id: gameId,
    slug: setCode.toLowerCase(),
    name: goodsName,
    name_ko: goodsName,
    released_on: null,
    card_count: null,
  };
}

/** Maps a parsed card onto `cards` + `card_printings` row inputs. */
export function mapCardToRows(
  parsed: ParsedCard,
  context: { gameId: string; setName: string; setCode: string },
): MappedCard {
  const { gameId, setName, setCode } = context;
  // The CardNum is globally unique and stable, so it keys the slug — within one
  // set the same name + collector number can recur across foil variants (e.g.
  // 151's Master Ball / Poké Ball reverses), which differ only by CardNum.
  const slug = buildCardSlug(parsed.name, setCode.toLowerCase(), parsed.cardNum);
  const imageUrl = imageUrlFor(parsed.featureImage, 512);
  const thumbnailUrl = imageUrlFor(parsed.featureImage, 400);

  return {
    card: {
      game_id: gameId,
      set_id: '', // resolved after the set upsert
      slug,
      name: parsed.name,
      normalized_name: normalizeName(parsed.name),
      collector_number: parsed.collectorNumber,
      rarity: parsed.rarity,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
    },
    printing: {
      card_slug: slug,
      language: 'ko',
      region: 'KR',
      set_name: setName,
      set_code: setCode,
      collector_number: parsed.collectorNumber,
      rarity: parsed.rarity,
      finish: 'unknown',
      image_url: imageUrl,
      external_ids: {
        source: 'pokemoncard.co.kr',
        card_num: parsed.cardNum,
        kr_set_code: setCode,
      },
    },
  };
}
