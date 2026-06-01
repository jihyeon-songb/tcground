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
  KREAM_CURRENCY,
  KREAM_MARKET,
  KREAM_SOURCE_NAME,
  isKreamCollectionEnabled,
} from './kream-config';
import {
  PriceSourceAccessNotGrantedError,
  type PriceObservationInput,
  type PriceVariant,
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

const GRADE_COMPANIES = ['PSA', 'BGS', 'BRG', 'CGC', 'SGC', 'ARS'] as const;

/**
 * Parses a KREAM option label into a grading bucket. Returns `raw` (ungraded)
 * when no known grading company is present, otherwise the company + numeric
 * grade. Trailing qualifiers like `영문`/`한글판` are ignored for bucketing.
 */
export function parseKreamOption(optionLabel: string | undefined): {
  variant: PriceVariant;
  gradeCompany: string | null;
  gradeValue: string | null;
} {
  const label = (optionLabel ?? '').toUpperCase();
  const company = GRADE_COMPANIES.find((name) => label.includes(name));

  if (!company) {
    return { variant: 'raw', gradeCompany: null, gradeValue: null };
  }

  const after = label.slice(label.indexOf(company) + company.length);
  const match = after.match(/\d+(\.\d+)?/);

  return {
    variant: 'graded',
    gradeCompany: company,
    gradeValue: match ? match[0] : null,
  };
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
 * Collects KREAM completed trades for one product. Throws
 * {@link PriceSourceAccessNotGrantedError} unless access is explicitly granted —
 * KREAM offers no official public API and reuse rights are unconfirmed, so
 * automated collection stays off until a compliant path exists.
 */
export async function collectKreamTrades(
  _productUrl: string,
  _context: KreamTradeContext,
  options: CollectKreamOptions = {},
): Promise<PriceObservationInput[]> {
  const accessGranted = options.accessGranted ?? isKreamCollectionEnabled();
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(KREAM_SOURCE_NAME);
  }

  // Live trade-history fetch + parsing is intentionally unimplemented until a
  // compliant access path is confirmed. The mapping above is ready to wire in.
  throw new PriceSourceAccessNotGrantedError(
    KREAM_SOURCE_NAME,
    'KREAM live collection is not implemented; use the manual_kream CSV import path',
  );
}

function minimizePayload(trade: KreamTrade): Record<string, unknown> {
  return {
    productId: trade.productId != null ? String(trade.productId) : null,
    optionLabel: trade.optionLabel ?? null,
  };
}
