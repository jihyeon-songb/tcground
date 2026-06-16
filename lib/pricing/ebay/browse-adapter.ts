/**
 * eBay Browse API adapter (active listings → daily asking snapshot).
 *
 * The Browse API is available to any developer with OAuth client credentials, so
 * it is the realistic automated eBay source for an individual developer. It
 * returns *current asking* prices (not completed sales), which PRD treats as a
 * secondary indicator. The daily collection job records one asking
 * `SnapshotAggregate` per card so the chart can build a real time series.
 *
 * Browse cannot backfill history — the weekly series fills in over ~7 days of
 * daily collection.
 */

import {
  BROWSE_SCOPE,
  ITEM_SUMMARY_SEARCH_PATH,
  loadEbayConfig,
  type EbayConfig,
} from './ebay-config';
import { getApplicationAccessToken } from './ebay-oauth';
import type { PriceMarket, SnapshotAggregate } from '../price-source.types';

export const BROWSE_SOURCE_NAME = 'ebay_browse';

export interface BrowseCardQuery {
  cardPrintingId: string;
  cardName: string;
  nameEn?: string | null;
  nameJa?: string | null;
  collectorNumber: string | null;
}

interface ItemSummary {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
}

interface ItemSummaryResponse {
  total?: number;
  itemSummaries?: ItemSummary[];
}

export interface MapSnapshotContext {
  cardPrintingId: string;
  snapshotDate: string;
}

export interface CollectBrowseOptions {
  config?: EbayConfig;
  fetchImpl?: typeof fetch;
  /** `YYYY-MM-DD` for the snapshot. Defaults to today (UTC). */
  snapshotDate?: string;
  limit?: number;
  /** Per OAuth/search request timeout, ms. */
  timeoutMs?: number;
  /** Marketplace prices to bucket under. eBay.com asks are USD/NA. */
  market?: PriceMarket;
  currency?: string;
}

/** Builds a search keyword biased toward the Korean-language printing. */
export function buildBrowseKeyword(query: BrowseCardQuery): string {
  const searchableName = query.nameEn ?? query.nameJa ?? query.cardName;
  return [searchableName, query.collectorNumber, 'Korean'].filter(Boolean).join(' ');
}

/** Builds the Browse item_summary/search URL. Pure. */
export function buildItemSummarySearchUrl(
  config: EbayConfig,
  keyword: string,
  limit: number,
): string {
  const url = new URL(`${config.apiBaseUrl}${ITEM_SUMMARY_SEARCH_PATH}`);
  url.searchParams.set('q', keyword);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE|AUCTION}');
  return url.toString();
}

/**
 * Reduces active listings to a single daily asking snapshot. Uses the median as
 * the representative asking price (robust to outlier listings). Returns null
 * when there are no usable priced listings.
 */
export function mapItemSummariesToSnapshot(
  payload: ItemSummaryResponse,
  context: MapSnapshotContext,
  market: PriceMarket = 'NA',
  currency = 'USD',
): SnapshotAggregate | null {
  const prices = (payload.itemSummaries ?? [])
    .filter((item) => (item.price?.currency ?? currency) === currency)
    .map((item) => Number.parseFloat(item.price?.value ?? ''))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);

  return {
    cardPrintingId: context.cardPrintingId,
    snapshotDate: context.snapshotDate,
    market,
    currency,
    variant: 'raw',
    conditionLabel: null,
    gradeCompany: null,
    gradeValue: null,
    avgPrice: roundCurrency(median(sorted)),
    minPrice: roundCurrency(sorted[0]),
    maxPrice: roundCurrency(sorted[sorted.length - 1]),
    sampleCount: sorted.length,
    sourceName: BROWSE_SOURCE_NAME,
    sourceUrl: null,
    aggregationMethod: 'browse_asking_median',
  };
}

/** Fetches active listings for one card and returns its daily asking snapshot. */
export async function collectBrowseSnapshot(
  query: BrowseCardQuery,
  options: CollectBrowseOptions = {},
): Promise<SnapshotAggregate | null> {
  const config = options.config ?? loadEbayConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const market = options.market ?? 'NA';
  const currency = options.currency ?? 'USD';
  const limit = options.limit ?? 50;
  const fetchWithTimeout = withTimeout(fetchImpl, options.timeoutMs ?? 8_000);

  const token = await getApplicationAccessToken(BROWSE_SCOPE, {
    config,
    fetchImpl: fetchWithTimeout,
  });
  const keyword = buildBrowseKeyword(query);
  const url = buildItemSummarySearchUrl(config, keyword, limit);

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  });

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`eBay Browse search failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as ItemSummaryResponse;
  return mapItemSummariesToSnapshot(
    payload,
    { cardPrintingId: query.cardPrintingId, snapshotDate },
    market,
    currency,
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

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<no body>';
  }
}

function withTimeout(fetchImpl: typeof fetch, timeoutMs: number): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(input, { ...init, signal: init?.signal ?? controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`fetch timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }) as typeof fetch;
}
