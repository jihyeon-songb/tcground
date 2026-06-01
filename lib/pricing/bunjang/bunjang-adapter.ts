/**
 * 번개장터 (Bunjang) adapter (active listings → daily asking snapshot).
 *
 * SCAFFOLD: the mapping below is implemented and tested so it can drop in once a
 * compliant Bunjang access path exists, but `collectBunjangSnapshot` refuses to
 * call the network until `BUNJANG_COLLECTION_ENABLED` is explicitly set. Until
 * then, real Bunjang data comes from the manual CSV import path
 * (`manual_bunjang` asking rows).
 *
 * Like eBay Browse, Bunjang returns *current asking* prices, reduced to one
 * daily median-asking snapshot per card (robust to outlier listings).
 */

import {
  BUNJANG_CURRENCY,
  BUNJANG_MARKET,
  BUNJANG_SOURCE_NAME,
  isBunjangCollectionEnabled,
} from './bunjang-config';
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
  /**
   * Must be explicitly true once a compliant Bunjang access path is granted.
   * Defaults to the `BUNJANG_COLLECTION_ENABLED` env flag.
   */
  accessGranted?: boolean;
}

/**
 * Reduces active Bunjang listings to a single daily asking snapshot, using the
 * median listing price as the representative asking price. Returns null when
 * there are no usable priced listings.
 */
export function mapBunjangListingsToSnapshot(
  payload: BunjangSearchResponse,
  context: BunjangSnapshotContext,
): SnapshotAggregate | null {
  const prices = (payload.list ?? [])
    .map((listing) =>
      typeof listing.price === 'string' ? Number.parseFloat(listing.price) : listing.price,
    )
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);

  return {
    cardPrintingId: context.cardPrintingId,
    snapshotDate: context.snapshotDate,
    market: BUNJANG_MARKET,
    currency: BUNJANG_CURRENCY,
    variant: 'raw',
    conditionLabel: null,
    gradeCompany: null,
    gradeValue: null,
    avgPrice: roundCurrency(median(sorted)),
    minPrice: roundCurrency(sorted[0]),
    maxPrice: roundCurrency(sorted[sorted.length - 1]),
    sampleCount: sorted.length,
    sourceName: BUNJANG_SOURCE_NAME,
    sourceUrl: null,
    aggregationMethod: 'bunjang_asking_median',
  };
}

/**
 * Collects a daily asking snapshot for one card from Bunjang. Throws
 * {@link PriceSourceAccessNotGrantedError} unless access is explicitly granted —
 * Bunjang offers no official public API and reuse rights are unconfirmed, so
 * automated collection stays off until a compliant path exists.
 */
export async function collectBunjangSnapshot(
  _keyword: string,
  _context: BunjangSnapshotContext,
  options: CollectBunjangOptions = {},
): Promise<SnapshotAggregate | null> {
  const accessGranted = options.accessGranted ?? isBunjangCollectionEnabled();
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(BUNJANG_SOURCE_NAME);
  }

  // Live search fetch + parsing is intentionally unimplemented until a compliant
  // access path is confirmed. The mapping above is ready to wire in.
  throw new PriceSourceAccessNotGrantedError(
    BUNJANG_SOURCE_NAME,
    'Bunjang live collection is not implemented; use the manual_bunjang CSV import path',
  );
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
