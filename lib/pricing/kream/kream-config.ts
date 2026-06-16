/**
 * KREAM source configuration.
 *
 * KREAM (https://kream.co.kr) is a Korean escrow-based resale marketplace that
 * exposes per-product buying options and completed trade history. TCGround's
 * automated KREAM source intentionally records only current asking prices
 * (판매중 호가) as daily snapshots, keeping them separate from completed-sale
 * evidence.
 *
 * KREAM exposes no official public API, and reuse rights are unconfirmed, so
 * automated collection is GATED behind `KREAM_COLLECTION_ENABLED` and must stay
 * off until a compliant access path (partner/API agreement) is in place. Legacy
 * manually verified KREAM completed trades remain in the CSV as `manual_kream`
 * sold evidence. See `memory-bank/trouble-shooting.md`.
 */

import type { PriceMarket } from '../price-source.types';

/** Source name for automated KREAM asking snapshots. */
export const KREAM_SOURCE_NAME = 'kream';

/** KREAM site origin; product trade-history and ask data live under API paths. */
export const KREAM_API_BASE_URL = 'https://kream.co.kr';
export const KREAM_TRADES_PATH = (productId: string) => `/api/products/${productId}/trading_infos`;
export const KREAM_ASKS_PATH = (productId: string) => `/api/products/${productId}/sales_options`;

/** Product search endpoint used to resolve a card name → KREAM product. */
export const KREAM_SEARCH_PATH = '/api/search';

/** Canonical product URL for attribution and trade-history resolution. */
export const KREAM_PRODUCT_URL = (productId: string) =>
  `${KREAM_API_BASE_URL}/products/${productId}`;

/** KREAM trades are Korean-market, settled in KRW. */
export const KREAM_MARKET: PriceMarket = 'KR';
export const KREAM_CURRENCY = 'KRW';

/**
 * Whether automated KREAM collection is permitted. Defaults to the
 * `KREAM_COLLECTION_ENABLED` env flag; must be explicitly `"true"`.
 */
export function isKreamCollectionEnabled(): boolean {
  return process.env.KREAM_COLLECTION_ENABLED === 'true';
}
