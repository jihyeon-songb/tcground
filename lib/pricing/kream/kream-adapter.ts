/**
 * KREAM adapter (completed trades → sold observations).
 *
 * SCAFFOLD: the mapping below is implemented and tested so it can drop in once a
 * compliant KREAM access path exists, but `collectKreamTrades` refuses to call
 * the network until `KREAM_COLLECTION_ENABLED` is explicitly set. Until then,
 * real KREAM sold data comes from the manual CSV import path (`manual_kream`).
 *
 * Data minimization: only price, trade time, option/grade, item id/url and a
 * minimal payload are kept. Seller/buyer identity and full raw content are
 * never stored.
 */

import {
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

export interface KreamTradeContext {
  cardPrintingId: string;
  /** Card-match confidence assigned during query resolution, 0..1. */
  confidenceScore: number;
  /** Canonical product URL for attribution, e.g. https://kream.co.kr/products/804751. */
  productUrl?: string | null;
  observedAt?: string;
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

/** Extracts the numeric KREAM product id from a product URL, or null. */
export function extractKreamProductId(productUrl: string): string | null {
  const match = productUrl.match(/products\/(\d+)/);
  return match ? match[1] : null;
}

/** Builds the KREAM trade-history (체결 내역) URL for a product. Pure. */
export function buildKreamTradesUrl(productId: string): string {
  return `${KREAM_API_BASE_URL}${KREAM_TRADES_PATH(productId)}`;
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
