/**
 * 번개장터 (Bunjang) source configuration.
 *
 * Bunjang (https://m.bunjang.co.kr) is a Korean C2C marketplace. Its listings
 * are *current asking* prices (판매중 호가), not completed sales — analogous to
 * the eBay Browse source — so the daily collection records one asking
 * `SnapshotAggregate` per card.
 *
 * Bunjang exposes no official public API, and reuse rights are unconfirmed, so
 * automated collection is GATED behind `BUNJANG_COLLECTION_ENABLED` and must stay
 * off until a compliant access path exists. Until then, real Bunjang data comes
 * only through the manual CSV import path (`manual_bunjang` asking rows).
 */

import type { PriceMarket } from '../price-source.types';

/** Source name for automated Bunjang asking snapshots. */
export const BUNJANG_SOURCE_NAME = 'bunjang';

/** Bunjang search endpoint origin + path (used once a compliant path exists). */
export const BUNJANG_API_BASE_URL = 'https://api.bunjang.co.kr';
export const BUNJANG_SEARCH_PATH = '/api/1/find_v2.json';

/** Bunjang listings are Korean-market, priced in KRW. */
export const BUNJANG_MARKET: PriceMarket = 'KR';
export const BUNJANG_CURRENCY = 'KRW';

/**
 * Whether automated Bunjang collection is permitted. Defaults to the
 * `BUNJANG_COLLECTION_ENABLED` env flag; must be explicitly `"true"`.
 */
export function isBunjangCollectionEnabled(): boolean {
  return process.env.BUNJANG_COLLECTION_ENABLED === 'true';
}
