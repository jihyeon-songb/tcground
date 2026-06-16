/**
 * KREAM adapter (current asking options → daily asking snapshots).
 *
 * SCAFFOLD: the mapping below is implemented and tested so it can drop in once a
 * compliant KREAM access path exists, but `collectKreamAskingSnapshots` refuses
 * to call the network until `KREAM_COLLECTION_ENABLED` is explicitly set.
 * Completed KREAM trades collected earlier through manual verification stay as
 * `manual_kream` sold evidence; automated KREAM collection emits asking
 * snapshots only.
 *
 * Data minimization: only option/grade and ask price are reduced into a daily
 * snapshot. Seller identity, buyer identity and full raw content are never
 * stored.
 */

import {
  KREAM_ASKS_PATH,
  KREAM_API_BASE_URL,
  KREAM_CURRENCY,
  KREAM_MARKET,
  KREAM_SOURCE_NAME,
  KREAM_TRADES_PATH,
  isKreamCollectionEnabled,
} from './kream-config';
import {
  buildKreamSearchUrl,
  resolveKreamProduct,
  type KreamSearchResponse,
  type ResolvedKreamProduct,
} from './kream-search';
import { parseGradeLabel, type ParsedGrade } from '../grade-parse';
import type { MatchTarget } from '../match-confidence';
import {
  PriceSourceAccessNotGrantedError,
  type PriceObservationInput,
  type SnapshotAggregate,
} from '../price-source.types';

/** One completed trade from a KREAM product trade-history (체결 내역) response. */
interface KreamTrade {
  /** Trade price in KRW. May arrive as number or numeric string. */
  price?: number | string;
  /** ISO-ish timestamp the trade settled (체결 시각). */
  tradedAt?: string;
  /**
   * Option label for the settled SKU, e.g. `"PSA 10"`, `"BRG 8.5 영문"`,
   * `"미감정"`. Used to derive grade/variant.
   */
  optionLabel?: string;
  /** KREAM product/trade identifier. */
  tradeId?: string | number;
  productId?: string | number;
}

interface KreamTradesResponse {
  trades?: KreamTrade[];
}

/** One active KREAM ask / sales option. Field names vary by endpoint version. */
interface KreamAsk {
  price?: number | string;
  askPrice?: number | string;
  ask_price?: number | string;
  lowestAskPrice?: number | string;
  lowest_ask_price?: number | string;
  lowestPrice?: number | string;
  lowest_price?: number | string;
  immediatePurchasePrice?: number | string;
  immediate_purchase_price?: number | string;
  optionLabel?: string;
  option?: string;
  option_name?: string;
  name?: string;
  productId?: string | number;
  product_id?: string | number;
}

interface KreamAsksResponse {
  asks?: KreamAsk[];
  salesOptions?: KreamAsk[];
  sales_options?: KreamAsk[];
  options?: KreamAsk[];
  items?: KreamAsk[];
  data?: KreamAsk[] | { asks?: KreamAsk[]; sales_options?: KreamAsk[]; options?: KreamAsk[] };
}

export interface KreamTradeContext {
  cardPrintingId: string;
  /** Card-match confidence assigned during query resolution, 0..1. */
  confidenceScore: number;
  /** Canonical product URL for attribution, e.g. https://kream.co.kr/products/804751. */
  productUrl?: string | null;
  observedAt?: string;
}

export interface KreamAskingSnapshotContext {
  cardPrintingId: string;
  /** `YYYY-MM-DD` for the snapshot. */
  snapshotDate: string;
  /** Canonical product URL for attribution, e.g. https://kream.co.kr/products/804751. */
  productUrl?: string | null;
}

export interface CollectKreamOptions {
  fetchImpl?: typeof fetch;
  /**
   * Must be explicitly true once a compliant KREAM access path is granted.
   * Defaults to the `KREAM_COLLECTION_ENABLED` env flag.
   */
  accessGranted?: boolean;
}

/**
 * Parses a KREAM option label into a grading bucket. Thin wrapper around the
 * shared {@link parseGradeLabel} so existing KREAM callers/tests keep working.
 */
export function parseKreamOption(optionLabel: string | undefined): ParsedGrade {
  return parseGradeLabel(optionLabel);
}

/**
 * Maps KREAM completed trades to sold observations. Drops trades without a
 * usable price or trade time.
 */
export function mapKreamTradesToObservations(
  payload: KreamTradesResponse,
  context: KreamTradeContext,
): PriceObservationInput[] {
  const observedAt = context.observedAt ?? new Date().toISOString();

  return (payload.trades ?? [])
    .map((trade): PriceObservationInput | null => {
      const price = typeof trade.price === 'string' ? Number.parseFloat(trade.price) : trade.price;
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
      if (!trade.tradedAt) return null;

      const { variant, gradeCompany, gradeValue } = parseKreamOption(trade.optionLabel);

      return {
        cardPrintingId: context.cardPrintingId,
        sourceName: KREAM_SOURCE_NAME,
        market: KREAM_MARKET,
        currency: KREAM_CURRENCY,
        soldPrice: price,
        soldAt: trade.tradedAt,
        observedAt,
        conditionLabel: null,
        gradeCompany,
        gradeValue,
        variant,
        listingTitle: trade.optionLabel ?? null,
        sourceUrl: context.productUrl ?? null,
        sourceItemId: trade.tradeId != null ? String(trade.tradeId) : null,
        confidenceScore: context.confidenceScore,
        rawPayload: minimizePayload(trade),
      };
    })
    .filter((item): item is PriceObservationInput => item !== null);
}

/**
 * Reduces KREAM active asks to one median-asking snapshot per (variant, grade)
 * bucket. Graded ask options never mix with raw/ungraded card asks.
 */
export function mapKreamAsksToSnapshots(
  payload: KreamAsksResponse,
  context: KreamAskingSnapshotContext,
): SnapshotAggregate[] {
  const buckets = new Map<
    string,
    {
      gradeCompany: string | null;
      gradeValue: string | null;
      variant: 'raw' | 'graded';
      prices: number[];
    }
  >();

  for (const ask of extractAskRows(payload)) {
    const price = readAskPrice(ask);
    if (price === null) continue;

    const optionLabel = readAskOptionLabel(ask);
    const { variant, gradeCompany, gradeValue } = parseKreamOption(optionLabel);
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
      market: KREAM_MARKET,
      currency: KREAM_CURRENCY,
      variant: bucket.variant,
      conditionLabel: null,
      gradeCompany: bucket.gradeCompany,
      gradeValue: bucket.gradeValue,
      avgPrice: roundCurrency(median(sorted)),
      minPrice: roundCurrency(sorted[0]),
      maxPrice: roundCurrency(sorted[sorted.length - 1]),
      sampleCount: sorted.length,
      sourceName: KREAM_SOURCE_NAME,
      sourceUrl: context.productUrl ?? null,
      aggregationMethod: 'kream_asking_median',
    });
  }

  return snapshots;
}

/** Extracts the numeric KREAM product id from a product URL, or null. */
export function extractKreamProductId(productUrl: string): string | null {
  const match = productUrl.match(/products\/(\d+)/);
  return match ? match[1] : null;
}

/** Builds the KREAM trade-history (체결 내역) URL for a product. Pure. */
export function buildKreamTradesUrl(productId: string): string {
  return `${KREAM_API_BASE_URL}${KREAM_TRADES_PATH(productId)}`;
}

/** Builds the KREAM asking-options URL for a product. Pure. */
export function buildKreamAsksUrl(productId: string): string {
  return `${KREAM_API_BASE_URL}${KREAM_ASKS_PATH(productId)}`;
}

/**
 * Collects KREAM completed trades for one product. Throws
 * {@link PriceSourceAccessNotGrantedError} unless access is explicitly granted —
 * KREAM offers no official public API and reuse rights are unconfirmed, so
 * automated collection stays GATED behind `KREAM_COLLECTION_ENABLED` and must
 * only run once a compliant access path is in place.
 */
export async function collectKreamTrades(
  productUrl: string,
  context: KreamTradeContext,
  options: CollectKreamOptions = {},
): Promise<PriceObservationInput[]> {
  const accessGranted = options.accessGranted ?? isKreamCollectionEnabled();
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(KREAM_SOURCE_NAME);
  }

  const productId = extractKreamProductId(productUrl);
  if (!productId) {
    throw new Error(`Could not extract a KREAM product id from "${productUrl}"`);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(buildKreamTradesUrl(productId), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`KREAM trade-history fetch failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as KreamTradesResponse;
  return mapKreamTradesToObservations(payload, {
    ...context,
    productUrl: context.productUrl ?? productUrl,
  });
}

/**
 * Collects KREAM current asking snapshots for one product. Throws
 * {@link PriceSourceAccessNotGrantedError} unless access is explicitly granted.
 */
export async function collectKreamAskingSnapshots(
  productUrl: string,
  context: KreamAskingSnapshotContext,
  options: CollectKreamOptions = {},
): Promise<SnapshotAggregate[]> {
  const accessGranted = options.accessGranted ?? isKreamCollectionEnabled();
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(KREAM_SOURCE_NAME);
  }

  const productId = extractKreamProductId(productUrl);
  if (!productId) {
    throw new Error(`Could not extract a KREAM product id from "${productUrl}"`);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(buildKreamAsksUrl(productId), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`KREAM asking-options fetch failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as KreamAsksResponse;
  const snapshotDate = context.snapshotDate ?? new Date().toISOString().slice(0, 10);
  return mapKreamAsksToSnapshots(payload, {
    ...context,
    snapshotDate,
    productUrl: context.productUrl ?? productUrl,
  });
}

/**
 * Searches KREAM by card name and resolves the best-matching product. Throws
 * {@link PriceSourceAccessNotGrantedError} unless access is granted (same gate as
 * trade collection). Returns null when no product matches the target.
 */
export async function resolveKreamProductByName(
  keyword: string,
  target: MatchTarget,
  options: CollectKreamOptions = {},
): Promise<ResolvedKreamProduct | null> {
  const accessGranted = options.accessGranted ?? isKreamCollectionEnabled();
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(KREAM_SOURCE_NAME);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(buildKreamSearchUrl(keyword), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`KREAM search failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as KreamSearchResponse;
  return resolveKreamProduct(payload, target);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<no body>';
  }
}

function minimizePayload(trade: KreamTrade): Record<string, unknown> {
  return {
    productId: trade.productId != null ? String(trade.productId) : null,
    optionLabel: trade.optionLabel ?? null,
  };
}

function extractAskRows(payload: KreamAsksResponse): KreamAsk[] {
  if (Array.isArray(payload.asks)) return payload.asks;
  if (Array.isArray(payload.salesOptions)) return payload.salesOptions;
  if (Array.isArray(payload.sales_options)) return payload.sales_options;
  if (Array.isArray(payload.options)) return payload.options;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.asks)) return payload.data.asks;
    if (Array.isArray(payload.data.sales_options)) return payload.data.sales_options;
    if (Array.isArray(payload.data.options)) return payload.data.options;
  }
  return [];
}

function readAskPrice(ask: KreamAsk): number | null {
  const value =
    ask.lowestAskPrice ??
    ask.lowest_ask_price ??
    ask.askPrice ??
    ask.ask_price ??
    ask.immediatePurchasePrice ??
    ask.immediate_purchase_price ??
    ask.lowestPrice ??
    ask.lowest_price ??
    ask.price;
  const price = typeof value === 'string' ? Number.parseFloat(value.replace(/,/g, '')) : value;
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null;
}

function readAskOptionLabel(ask: KreamAsk): string | undefined {
  return ask.optionLabel ?? ask.option ?? ask.option_name ?? ask.name;
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
