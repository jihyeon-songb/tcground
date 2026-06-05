/**
 * Guardian TCG source configuration.
 *
 * Guardian TCG (https://guardiantcg.app) is a third-party aggregator with a
 * developer API and free tier. For Korean-print cards it exposes raw + graded
 * *aggregate estimates* (PriceCharting-derived), not individual completed sales —
 * so it is a REFERENCE / cross-validation source, never an importable sold
 * observation (see `memory-bank/trouble-shooting.md`). Its estimates are stored
 * under their own `source_name` so they never mix into the sold/asking trend.
 */

import type { PriceMarket } from '../price-source.types';

/** Source name for Guardian TCG aggregate estimates. */
export const GUARDIAN_SOURCE_NAME = 'guardian_tcg';

/** Guardian estimates are PriceCharting-derived, reported in USD. */
export const GUARDIAN_MARKET: PriceMarket = 'NA';
export const GUARDIAN_CURRENCY = 'USD';

export const GUARDIAN_API_BASE_URL = 'https://guardiantcg.app';
export const GUARDIAN_ESTIMATE_PATH = '/api/estimate';

export interface GuardianConfig {
  apiKey: string;
}

/** Reads the Guardian API key from env. Throws if missing. */
export function loadGuardianConfig(): GuardianConfig {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) {
    throw new Error('Guardian TCG API requires GUARDIAN_API_KEY');
  }
  return { apiKey };
}

/** Whether Guardian collection can run (API key present). */
export function isGuardianCollectionEnabled(): boolean {
  return Boolean(process.env.GUARDIAN_API_KEY);
}
