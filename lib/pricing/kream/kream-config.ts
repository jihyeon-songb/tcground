/**
 * KREAM source configuration.
 *
 * KREAM (https://kream.co.kr) is a Korean escrow-based resale marketplace that
 * publishes per-product *completed trade* history (체결 시세) — real sold prices,
 * not asking prices. That makes it a high-value `sold` source for Korean-print
 * Pokémon cards.
 *
 * KREAM exposes no official public API, and reuse rights are unconfirmed, so
 * automated collection is GATED behind `KREAM_COLLECTION_ENABLED` and must stay
 * off until a compliant access path (partner/API agreement) is in place. Until
 * then, real KREAM data comes only through the manual CSV import path
 * (`manual_kream` rows). See `memory-bank/trouble-shooting.md`.
 */

import type { PriceMarket } from '../price-source.types';

/** Source name for automated KREAM completed-trade observations. */
export const KREAM_SOURCE_NAME = 'kream';

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
