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
  EBAY_WEB_BASE_URL,
  ITEM_SUMMARY_SEARCH_PATH,
  loadEbayConfig,
  type EbayConfig,
} from './ebay-config';
import { getApplicationAccessToken } from './ebay-oauth';
import type { PriceMarket, SnapshotAggregate, SnapshotListing } from '../price-source.types';

/** Max individual listings kept on an asking snapshot for the detail page. */
const MAX_LISTINGS = 10;

export const BROWSE_SOURCE_NAME = 'ebay_browse';
export const AUCTION_SOURCE_NAME = 'ebay_auction';

/** eBay buying option a Browse search is scoped to. */
export type BrowseBuyingOption = 'FIXED_PRICE' | 'AUCTION';

export interface BrowseCardQuery {
  cardPrintingId: string;
  cardName: string;
  nameEn?: string | null;
  nameJa?: string | null;
  collectorNumber: string | null;
  setCode?: string | null;
}

interface ItemSummary {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  /** Auction listings expose the current bid here instead of a fixed price. */
  currentBidPrice?: { value?: string; currency?: string };
  itemWebUrl?: string;
  /** eBay tags each item with its buying options, e.g. `['FIXED_PRICE']` or `['AUCTION']`. */
  buyingOptions?: string[];
}

interface ItemSummaryResponse {
  total?: number;
  itemSummaries?: ItemSummary[];
}

export interface MapSnapshotContext {
  cardPrintingId: string;
  snapshotDate: string;
  /** Source bucket the snapshot is recorded under. Defaults to fixed-price browse. */
  sourceName?: string;
  /** Aggregation label stored on the snapshot. */
  aggregationMethod?: string;
  /** `buyingOption` the listings came from; picks fixed price vs current bid. */
  buyingOption?: BrowseBuyingOption;
  /** Keyword used to build a fallback eBay search link when no listing URL exists. */
  keyword?: string;
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
  /** Fixed-price asks (default) or auction current bids. */
  buyingOption?: BrowseBuyingOption;
}

/**
 * Builds an eBay search keyword for a Korean-language printing.
 *
 * eBay is an English marketplace, so the Korean card name returns nothing. We
 * key off the enriched English species name when present; otherwise (Trainers,
 * unmapped cards) we fall back to the collector number + set code, which eBay
 * sellers reliably include in their titles.
 */
export function buildBrowseKeyword(query: BrowseCardQuery): string {
  if (query.nameEn) {
    return [query.nameEn, query.collectorNumber, 'Korean'].filter(Boolean).join(' ');
  }
  return [query.collectorNumber, query.setCode, 'Korean Pokemon'].filter(Boolean).join(' ');
}

/**
 * Builds the Browse item_summary/search URL. Pure.
 *
 * Pass a single buying option for a scoped search, or both
 * (`['FIXED_PRICE', 'AUCTION']`) to fetch fixed-price asks and auction bids in
 * one call — eBay supports the `{A|B}` OR syntax and tags each returned item
 * with its `buyingOptions`, so the caller can partition the results.
 */
export function buildItemSummarySearchUrl(
  config: EbayConfig,
  keyword: string,
  limit: number,
  buyingOption: BrowseBuyingOption | readonly BrowseBuyingOption[] = 'FIXED_PRICE',
): string {
  const url = new URL(`${config.apiBaseUrl}${ITEM_SUMMARY_SEARCH_PATH}`);
  url.searchParams.set('q', keyword);
  url.searchParams.set('limit', String(limit));
  // FIXED_PRICE asks are a real asking price; AUCTION listings expose the current
  // bid (collected as a separate ebay_auction source). Completed auction (sold)
  // prices come from the ebay_scrape source.
  const options = Array.isArray(buyingOption) ? buyingOption : [buyingOption];
  url.searchParams.set('filter', `buyingOptions:{${options.join('|')}}`);
  return url.toString();
}

/** Builds the human-facing eBay search results URL for a keyword (link fallback). */
function buildEbaySearchPageUrl(keyword: string): string {
  const url = new URL(`${EBAY_WEB_BASE_URL}/sch/i.html`);
  url.searchParams.set('_nkw', keyword);
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
  const isAuction = context.buyingOption === 'AUCTION';
  // Auctions expose the live bid in `currentBidPrice`; fixed-price asks in `price`.
  const priced = (payload.itemSummaries ?? [])
    .map((item) => {
      const amount = isAuction ? (item.currentBidPrice ?? item.price) : item.price;
      return { value: Number.parseFloat(amount?.value ?? ''), currency: amount?.currency, item };
    })
    .filter((row) => row.currency === currency || row.currency === undefined)
    .filter((row) => Number.isFinite(row.value) && row.value > 0);

  if (priced.length === 0) return null;

  const sorted = [...priced].sort((a, b) => a.value - b.value);
  const cheapest = sorted[0];
  // Link to the cheapest listing; fall back to the search page when it has no URL.
  const sourceUrl =
    cheapest.item.itemWebUrl ??
    (context.keyword ? buildEbaySearchPageUrl(context.keyword) : null);

  // Keep the cheapest N listings (with a real per-listing URL) so the detail page
  // can link to individual asks, not just the cheapest. Auctions are excluded.
  const listings: SnapshotListing[] = isAuction
    ? []
    : sorted
        .filter((row) => Boolean(row.item.itemWebUrl))
        .slice(0, MAX_LISTINGS)
        .map((row) => ({
          price: roundCurrency(row.value),
          currency,
          url: row.item.itemWebUrl as string,
          title: row.item.title ?? null,
        }));

  return {
    cardPrintingId: context.cardPrintingId,
    snapshotDate: context.snapshotDate,
    market,
    currency,
    variant: 'raw',
    conditionLabel: null,
    gradeCompany: null,
    gradeValue: null,
    avgPrice: roundCurrency(median(sorted.map((row) => row.value))),
    minPrice: roundCurrency(sorted[0].value),
    maxPrice: roundCurrency(sorted[sorted.length - 1].value),
    sampleCount: sorted.length,
    sourceName: context.sourceName ?? (isAuction ? AUCTION_SOURCE_NAME : BROWSE_SOURCE_NAME),
    sourceUrl,
    listings: listings.length > 0 ? listings : undefined,
    aggregationMethod:
      context.aggregationMethod ?? (isAuction ? 'auction_bid_median' : 'browse_asking_median'),
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
  const buyingOption = options.buyingOption ?? 'FIXED_PRICE';
  const fetchWithTimeout = withTimeout(fetchImpl, options.timeoutMs ?? 8_000);

  const token = await getApplicationAccessToken(BROWSE_SCOPE, {
    config,
    fetchImpl: fetchWithTimeout,
  });
  const keyword = buildBrowseKeyword(query);
  const url = buildItemSummarySearchUrl(config, keyword, limit, buyingOption);

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
    {
      cardPrintingId: query.cardPrintingId,
      snapshotDate,
      buyingOption,
      keyword,
      sourceName: buyingOption === 'AUCTION' ? AUCTION_SOURCE_NAME : BROWSE_SOURCE_NAME,
    },
    market,
    currency,
  );
}

/**
 * Fetches active listings for one card in a SINGLE Browse search and returns
 * both its fixed-price (ebay_browse) and auction (ebay_auction) snapshots.
 *
 * One search returns items tagged with their `buyingOptions`, so we partition
 * the payload instead of issuing two separate calls. This halves the API call
 * count (one per card, not two), keeping a full-catalog daily census under the
 * Browse API's 5,000 calls/day limit.
 */
export async function collectBrowseAuctionSnapshots(
  query: BrowseCardQuery,
  options: CollectBrowseOptions = {},
): Promise<SnapshotAggregate[]> {
  const config = options.config ?? loadEbayConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const market = options.market ?? 'NA';
  const currency = options.currency ?? 'USD';
  // Wider than the single-option limit so both fixed-price and auction listings
  // get a usable sample from one response. Still one API call.
  const limit = options.limit ?? 100;
  const fetchWithTimeout = withTimeout(fetchImpl, options.timeoutMs ?? 8_000);

  const token = await getApplicationAccessToken(BROWSE_SCOPE, {
    config,
    fetchImpl: fetchWithTimeout,
  });
  const keyword = buildBrowseKeyword(query);
  const url = buildItemSummarySearchUrl(config, keyword, limit, ['FIXED_PRICE', 'AUCTION']);

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
  const items = payload.itemSummaries ?? [];

  const snapshots: SnapshotAggregate[] = [];
  for (const buyingOption of ['FIXED_PRICE', 'AUCTION'] as const) {
    const subset = items.filter((item) => (item.buyingOptions ?? []).includes(buyingOption));
    const snapshot = mapItemSummariesToSnapshot(
      { itemSummaries: subset },
      {
        cardPrintingId: query.cardPrintingId,
        snapshotDate,
        buyingOption,
        keyword,
        sourceName: buyingOption === 'AUCTION' ? AUCTION_SOURCE_NAME : BROWSE_SOURCE_NAME,
      },
      market,
      currency,
    );
    if (snapshot) snapshots.push(snapshot);
  }

  return snapshots;
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
