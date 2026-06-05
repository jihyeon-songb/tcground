/**
 * 번개장터 (Bunjang) adapter (active listings → daily asking snapshots).
 *
 * SCAFFOLD: the mapping below is implemented and tested so it can drop in once a
 * compliant Bunjang access path exists, but `collectBunjangSnapshots` refuses to
 * call the network until `BUNJANG_COLLECTION_ENABLED` is explicitly set. Until
 * then, real Bunjang data comes from the manual CSV import path
 * (`manual_bunjang` asking rows).
 *
 * Like eBay Browse, Bunjang returns *current asking* prices, reduced to median
 * asking snapshots per card. Listings are split into (variant, grade) buckets
 * via the shared grade parser, so a graded listing (e.g. "PSA 10") never mixes
 * into the raw asking price.
 */

import {
  BUNJANG_API_BASE_URL,
  BUNJANG_CURRENCY,
  BUNJANG_MARKET,
  BUNJANG_SEARCH_PATH,
  BUNJANG_SOURCE_NAME,
  isBunjangCollectionEnabled,
} from './bunjang-config';
import { parseGradeLabel } from '../grade-parse';
import {
  PriceSourceAccessNotGrantedError,
  type SnapshotAggregate,
} from '../price-source.types';

/** One active listing from a Bunjang search response. */
interface BunjangListing {
  /** Listing price in KRW. May arrive as number or numeric string. */
  price?: number | string;
  pid?: string | number;
  name?: string;
}

interface BunjangSearchResponse {
  list?: BunjangListing[];
}

export interface BunjangSnapshotContext {
  cardPrintingId: string;
  /** `YYYY-MM-DD` for the snapshot. */
  snapshotDate: string;
}

export interface CollectBunjangOptions {
  fetchImpl?: typeof fetch;
  snapshotDate?: string;
  /** Number of listings to request. */
  limit?: number;
  /**
   * Must be explicitly true once a compliant Bunjang access path is granted.
   * Defaults to the `BUNJANG_COLLECTION_ENABLED` env flag.
   */
  accessGranted?: boolean;
}

/** Builds the Bunjang search URL for a keyword. Pure. */
export function buildBunjangSearchUrl(keyword: string, limit = 100): string {
  const url = new URL(`${BUNJANG_API_BASE_URL}${BUNJANG_SEARCH_PATH}`);
  url.searchParams.set('q', keyword);
  url.searchParams.set('n', String(limit));
  url.searchParams.set('order', 'score');
  return url.toString();
}

/**
 * Reduces active Bunjang listings to one median-asking snapshot per
 * (variant, grade) bucket, using the median listing price as the representative
 * asking price. Returns an empty array when there are no usable priced listings.
 */
export function mapBunjangListingsToSnapshots(
  payload: BunjangSearchResponse,
  context: BunjangSnapshotContext,
): SnapshotAggregate[] {
  const buckets = new Map<
    string,
    { gradeCompany: string | null; gradeValue: string | null; variant: 'raw' | 'graded'; prices: number[] }
  >();

  for (const listing of payload.list ?? []) {
    const price =
      typeof listing.price === 'string' ? Number.parseFloat(listing.price) : listing.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;

    const { variant, gradeCompany, gradeValue } = parseGradeLabel(listing.name);
    const key = `${variant}|${gradeCompany ?? ''}|${gradeValue ?? ''}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.prices.push(price);
    } else {
      buckets.set(key, { gradeCompany, gradeValue, variant, prices: [price] });
    }
  }

  const snapshots: SnapshotAggregate[] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket.prices].sort((a, b) => a - b);
    snapshots.push({
      cardPrintingId: context.cardPrintingId,
      snapshotDate: context.snapshotDate,
      market: BUNJANG_MARKET,
      currency: BUNJANG_CURRENCY,
      variant: bucket.variant,
      conditionLabel: null,
      gradeCompany: bucket.gradeCompany,
      gradeValue: bucket.gradeValue,
      avgPrice: roundCurrency(median(sorted)),
      minPrice: roundCurrency(sorted[0]),
      maxPrice: roundCurrency(sorted[sorted.length - 1]),
      sampleCount: sorted.length,
      sourceName: BUNJANG_SOURCE_NAME,
      sourceUrl: null,
      aggregationMethod: 'bunjang_asking_median',
    });
  }

  return snapshots;
}

/**
 * Collects daily asking snapshots for one card from Bunjang. Throws
 * {@link PriceSourceAccessNotGrantedError} unless access is explicitly granted —
 * Bunjang offers no official public API and reuse rights are unconfirmed, so
 * automated collection stays GATED behind `BUNJANG_COLLECTION_ENABLED`.
 */
export async function collectBunjangSnapshots(
  keyword: string,
  context: BunjangSnapshotContext,
  options: CollectBunjangOptions = {},
): Promise<SnapshotAggregate[]> {
  const accessGranted = options.accessGranted ?? isBunjangCollectionEnabled();
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(BUNJANG_SOURCE_NAME);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const url = buildBunjangSearchUrl(keyword, options.limit ?? 100);

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`Bunjang search failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as BunjangSearchResponse;
  return mapBunjangListingsToSnapshots(payload, { ...context, snapshotDate });
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
