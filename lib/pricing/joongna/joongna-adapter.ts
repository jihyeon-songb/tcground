/**
 * 중고나라 (Joongna) adapter (active listings -> daily asking snapshots).
 *
 * The public search page embeds the first page of listing results in Next.js
 * hydration data. This adapter reads that public HTML, extracts only minimized
 * listing fields, and reduces matching single-card listings to median asking
 * snapshots. It never stores seller identity or full raw HTML.
 */

import {
  JOONGNA_CURRENCY,
  JOONGNA_MARKET,
  JOONGNA_SOURCE_NAME,
  JOONGNA_WEB_BASE_URL,
  isJoongnaCollectionEnabled,
} from './joongna-config';
import { parseGradeLabel } from '../grade-parse';
import { computeMatchConfidence, normalize, type MatchTarget } from '../match-confidence';
import {
  PriceSourceAccessNotGrantedError,
  type SnapshotAggregate,
} from '../price-source.types';

const MIN_JOONGNA_MATCH_CONFIDENCE = 0.7;

interface JoongnaListing {
  seq?: number | string;
  price?: number | string;
  title?: string;
  state?: number;
  sortDate?: string;
  objectType?: string;
}

export interface JoongnaSnapshotContext {
  cardPrintingId: string;
  snapshotDate: string;
  target: MatchTarget;
}

export interface CollectJoongnaOptions {
  fetchImpl?: typeof fetch;
  snapshotDate?: string;
  /** Maximum listings returned by the public search page. */
  limit?: number;
  /**
   * Must be explicitly true once a compliant Joongna access path is confirmed.
   * Defaults to the `JOONGNA_COLLECTION_ENABLED` env flag.
   */
  accessGranted?: boolean;
}

/** Builds the public Joongna search URL for a keyword. Pure. */
export function buildJoongnaSearchUrl(keyword: string): string {
  const url = new URL('/search', JOONGNA_WEB_BASE_URL);
  url.searchParams.set('keyword', keyword);
  return url.toString();
}

/**
 * Extracts minimized listing rows from a Joongna search-result HTML document.
 * The HTML stores data as escaped JSON inside Next.js script chunks, so we
 * unescape the script payload enough to parse product-shaped objects.
 */
export function extractJoongnaListingsFromHtml(html: string): JoongnaListing[] {
  const decoded = html
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/');
  const listings: JoongnaListing[] = [];
  let index = 0;

  while (index < decoded.length) {
    const start = decoded.indexOf('{"seq":', index);
    if (start === -1) break;
    const end = findBalancedObjectEnd(decoded, start);
    if (end === -1) {
      index = start + 1;
      continue;
    }

    const fragment = decoded.slice(start, end + 1);
    index = end + 1;

    try {
      const parsed = JSON.parse(fragment) as JoongnaListing;
      if (parsed.objectType === 'product' && parsed.title && parsed.price != null) {
        listings.push(minimizeListing(parsed));
      }
    } catch {
      // Ignore unrelated script objects that only look product-like.
    }
  }

  return dedupeListings(listings);
}

/**
 * Reduces Joongna active listings to one median asking snapshot per
 * (variant, grade) bucket. Low-confidence and noisy marketplace rows are
 * filtered out before aggregation.
 */
export function mapJoongnaListingsToSnapshots(
  listings: readonly JoongnaListing[],
  context: JoongnaSnapshotContext,
): SnapshotAggregate[] {
  const buckets = new Map<
    string,
    {
      gradeCompany: string | null;
      gradeValue: string | null;
      variant: 'raw' | 'graded';
      prices: number[];
      sourceUrls: string[];
    }
  >();

  for (const listing of listings) {
    const title = listing.title ?? null;
    if (isNoisyJoongnaTitle(title)) continue;
    if (!hasCollectorNumberEvidence(title, context.target.collectorNumber)) continue;

    const confidence = computeMatchConfidence(title, context.target);
    if (confidence < MIN_JOONGNA_MATCH_CONFIDENCE) continue;

    const price =
      typeof listing.price === 'string' ? Number.parseFloat(listing.price) : listing.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;

    const { variant, gradeCompany, gradeValue } = parseGradeLabel(title);
    const key = `${variant}|${gradeCompany ?? ''}|${gradeValue ?? ''}`;
    const existing = buckets.get(key);
    const sourceUrl = sourceUrlForListing(listing);
    if (existing) {
      existing.prices.push(price);
      if (sourceUrl) existing.sourceUrls.push(sourceUrl);
    } else {
      buckets.set(key, {
        gradeCompany,
        gradeValue,
        variant,
        prices: [price],
        sourceUrls: sourceUrl ? [sourceUrl] : [],
      });
    }
  }

  const snapshots: SnapshotAggregate[] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket.prices].sort((a, b) => a - b);
    snapshots.push({
      cardPrintingId: context.cardPrintingId,
      snapshotDate: context.snapshotDate,
      market: JOONGNA_MARKET,
      currency: JOONGNA_CURRENCY,
      variant: bucket.variant,
      conditionLabel: null,
      gradeCompany: bucket.gradeCompany,
      gradeValue: bucket.gradeValue,
      avgPrice: roundCurrency(median(sorted)),
      minPrice: roundCurrency(sorted[0]),
      maxPrice: roundCurrency(sorted[sorted.length - 1]),
      sampleCount: sorted.length,
      sourceName: JOONGNA_SOURCE_NAME,
      sourceUrl: bucket.sourceUrls[0] ?? null,
      aggregationMethod: 'joongna_asking_median',
    });
  }

  return snapshots;
}

/**
 * Collects daily asking snapshots for one card from Joongna. Throws
 * {@link PriceSourceAccessNotGrantedError} unless collection is explicitly
 * enabled.
 */
export async function collectJoongnaSnapshots(
  keyword: string,
  context: JoongnaSnapshotContext,
  options: CollectJoongnaOptions = {},
): Promise<SnapshotAggregate[]> {
  const accessGranted = options.accessGranted ?? isJoongnaCollectionEnabled();
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(JOONGNA_SOURCE_NAME);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const response = await fetchImpl(buildJoongnaSearchUrl(keyword), {
    method: 'GET',
    headers: {
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`Joongna search failed (${response.status}): ${detail}`);
  }

  const html = await response.text();
  const listings = extractJoongnaListingsFromHtml(html).slice(0, options.limit ?? 50);
  return mapJoongnaListingsToSnapshots(listings, { ...context, snapshotDate });
}

function findBalancedObjectEnd(input: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i += 1) {
    const char = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function minimizeListing(listing: JoongnaListing): JoongnaListing {
  return {
    seq: listing.seq,
    price: listing.price,
    title: listing.title,
    state: listing.state,
    sortDate: listing.sortDate,
    objectType: listing.objectType,
  };
}

function dedupeListings(listings: readonly JoongnaListing[]): JoongnaListing[] {
  const seen = new Set<string>();
  const result: JoongnaListing[] = [];
  for (const listing of listings) {
    const key = String(listing.seq ?? `${listing.title}|${listing.price}`);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(listing);
  }
  return result;
}

function sourceUrlForListing(listing: JoongnaListing): string | null {
  if (listing.seq == null) return null;
  return `${JOONGNA_WEB_BASE_URL}/product/${listing.seq}`;
}

const JOONGNA_NOISY_KEYWORDS = [
  '각개',
  '일괄',
  '묶음',
  '박스',
  '팩',
  '미개봉',
  '서플라이',
  '플레이매트',
  '슬리브',
  '프로모 카드',
  '카드게임 포켓',
  '카드 게임 포켓',
  '포켓몬카드게임포켓',
  '트레이드',
  '오리카',
  '프록시',
  '대리',
  '세트',
  '북미판',
  '영어판',
  '영문판',
  '일본판',
  '일판',
  '중국판',
  '중문판',
];

function isNoisyJoongnaTitle(title: string | null): boolean {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) return true;
  return JOONGNA_NOISY_KEYWORDS.some((keyword) => normalizedTitle.includes(normalize(keyword)));
}

function hasCollectorNumberEvidence(title: string | null, collectorNumber: string | null): boolean {
  if (!collectorNumber) return true;
  const normalizedNumber = normalize(collectorNumber);
  if (!normalizedNumber) return true;
  return normalize(title).includes(normalizedNumber);
}

function median(sortedValues: readonly number[]): number {
  const mid = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }
  return sortedValues[mid];
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<no body>';
  }
}
