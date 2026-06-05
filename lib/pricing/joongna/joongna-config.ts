/**
 * 중고나라 (Joongna) source configuration.
 *
 * Joongna (https://web.joongna.com) listings are current asking prices
 * (판매중 호가), not completed sales. Automated collection is gated so it can
 * stay off unless the current robots/terms and reuse scope have been reviewed.
 */

import type { PriceMarket } from '../price-source.types';

/** Source name for automated Joongna asking snapshots. */
export const JOONGNA_SOURCE_NAME = 'joongna';

/** Public web origin used for search-result pages and attribution URLs. */
export const JOONGNA_WEB_BASE_URL = 'https://web.joongna.com';

/** Joongna listings are Korean-market, priced in KRW. */
export const JOONGNA_MARKET: PriceMarket = 'KR';
export const JOONGNA_CURRENCY = 'KRW';

/**
 * Whether automated Joongna collection is permitted. Defaults to the
 * `JOONGNA_COLLECTION_ENABLED` env flag; must be explicitly `"true"`.
 */
export function isJoongnaCollectionEnabled(): boolean {
  return process.env.JOONGNA_COLLECTION_ENABLED === 'true';
}
