/**
 * Shared listing-relevance scorer for price-source adapters.
 *
 * Keyword search on marketplaces (eBay sold, KREAM search) returns a noisy mix:
 * the actual card, but also sleeves/toploaders/bundles and unrelated cheap items.
 * Adapters used to accept every priced listing with a flat confidence, so junk
 * (e.g. a 200원 sleeve) polluted a card's min/median. This module scores how well
 * a listing title matches the *intended* card so low-confidence rows can be
 * dropped before aggregation (`aggregate.ts` filters `< DEFAULT_CONFIDENCE_THRESHOLD`).
 *
 * Pure functions only — no IO. Mirrors the style of `grade-parse.ts`.
 */

/** What a listing should match to count as the intended card. */
export interface MatchTarget {
  /**
   * Card name candidates across locales (English, Japanese, Korean). Null/blank
   * entries are ignored — JP-exclusive sets have no English name, so eBay targets
   * often carry only `[ja, ko]`.
   */
  names: ReadonlyArray<string | null | undefined>;
  /** Collector number like `"217/187"` (full) — the left part also matches partially. */
  collectorNumber: string | null;
  /** Set name / set code tokens, e.g. `["SV8a", "테라스탈 페스타"]`. */
  setTokens?: ReadonlyArray<string | null | undefined>;
}

/**
 * Listings whose title contains any of these are accessories/bundles, never the
 * single card — they score 0 regardless of name match. ASCII terms match on word
 * boundaries; CJK terms match as substrings. Deliberately excludes ambiguous
 * terms like `단품`/`낱장` (which describe a loose *single card* — what we want).
 */
export const ACCESSORY_KEYWORDS: readonly string[] = [
  'sleeve',
  'toploader',
  'top loader',
  'binder',
  'playmat',
  'play mat',
  'deck box',
  'deckbox',
  'card case',
  'proxy',
  'lot of',
  'bundle',
  'set of',
  '슬리브',
  '보호필름',
  '케이스',
  '토퍼',
  '플레이매트',
  '디바이더',
  '바인더',
];

const NAME_WEIGHT = 0.5;
const NUMBER_FULL_WEIGHT = 0.3;
const NUMBER_PARTIAL_WEIGHT = 0.2;
const SET_WEIGHT = 0.2;

/**
 * Scores how confidently `title` refers to the card described by `target`, 0..1.
 * Returns 0 for accessory/bundle listings or when nothing matches. The score is a
 * clamped sum of: card-name token match, collector-number match (full or partial),
 * and set-token match.
 */
export function computeMatchConfidence(
  title: string | null | undefined,
  target: MatchTarget,
): number {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) return 0;
  if (containsAccessoryKeyword(normalizedTitle)) return 0;

  let score = 0;

  if (matchesAnyName(normalizedTitle, target.names)) {
    score += NAME_WEIGHT;
  }

  score += scoreCollectorNumber(normalizedTitle, target.collectorNumber);

  if (matchesAnySetToken(normalizedTitle, target.setTokens)) {
    score += SET_WEIGHT;
  }

  return clamp01(round2(score));
}

/**
 * Lowercases, applies NFKC, and replaces every run of non-alphanumeric /
 * non-CJK characters with a single space. Keeps Latin letters, digits, Hangul,
 * Hiragana, Katakana and CJK ideographs so cross-locale names survive.
 */
export function normalize(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z぀-ヿ㐀-䶿一-鿿가-힣]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function containsAccessoryKeyword(normalizedTitle: string): boolean {
  const padded = ` ${normalizedTitle} `;
  return ACCESSORY_KEYWORDS.some((keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword) return false;
    if (isAscii(normalizedKeyword)) {
      // Word-boundary match so "lot" never matches inside "pilot".
      return padded.includes(` ${normalizedKeyword} `);
    }
    return normalizedTitle.includes(normalizedKeyword);
  });
}

/** True when every significant token of at least one candidate name is present. */
function matchesAnyName(
  normalizedTitle: string,
  names: MatchTarget['names'],
): boolean {
  const titleTokens = new Set(normalizedTitle.split(' '));
  for (const name of names) {
    const tokens = normalize(name).split(' ').filter(Boolean);
    if (tokens.length === 0) continue;
    if (tokens.every((token) => titleTokens.has(token))) return true;
  }
  return false;
}

/** Full number ("217/187") scores higher than the bare left part ("217"). */
function scoreCollectorNumber(normalizedTitle: string, collectorNumber: string | null): number {
  if (!collectorNumber) return 0;
  const normalizedFull = normalize(collectorNumber);
  const titleTokens = new Set(normalizedTitle.split(' '));

  // "217/187" normalizes to "217 187"; treat it as matched when both parts adjoin.
  if (normalizedFull && normalizedTitle.includes(normalizedFull)) {
    return NUMBER_FULL_WEIGHT;
  }

  const leftPart = collectorNumber.split('/')[0]?.replace(/\D/g, '') ?? '';
  if (leftPart && titleTokens.has(leftPart)) {
    return NUMBER_PARTIAL_WEIGHT;
  }
  return 0;
}

function matchesAnySetToken(
  normalizedTitle: string,
  setTokens: MatchTarget['setTokens'],
): boolean {
  if (!setTokens) return false;
  return setTokens.some((token) => {
    const normalizedToken = normalize(token);
    return normalizedToken.length > 0 && normalizedTitle.includes(normalizedToken);
  });
}

function isAscii(value: string): boolean {
  return /^[\x00-\x7f]*$/.test(value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
