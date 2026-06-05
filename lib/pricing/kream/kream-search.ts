/**
 * KREAM product search → product resolution.
 *
 * KREAM trade history (체결가) is per *product*, so before fetching trades we must
 * map a catalog card to the right KREAM product. Rather than pre-mapping every
 * card by hand, we search KREAM by the Korean card name and pick the
 * best-matching product via the shared {@link computeMatchConfidence}. The
 * resolved match carries a confidence that flows into the observations, so an
 * ambiguous resolution (e.g. base print vs SAR vs Master Ball) is dropped during
 * aggregation instead of polluting the card's trades.
 *
 * Pure functions only. The network payload is fetched by the caller (browser
 * fetch) and passed to {@link resolveKreamProduct}.
 */

import { KREAM_PRODUCT_URL, KREAM_SEARCH_PATH, KREAM_API_BASE_URL } from './kream-config';
import { computeMatchConfidence, type MatchTarget } from '../match-confidence';

/** One product from a KREAM search response. Name fields vary, so we score all. */
export interface KreamSearchProduct {
  id?: number | string;
  /** Primary product name (often English/brand). */
  name?: string;
  /** Korean product name (한글), when present. */
  translatedName?: string;
  /** Alternate localized name some payloads include. */
  englishName?: string;
}

export interface KreamSearchResponse {
  items?: KreamSearchProduct[];
}

export interface ResolvedKreamProduct {
  productId: string;
  productUrl: string;
  confidence: number;
}

/** Builds the KREAM search URL for a keyword. Pure. */
export function buildKreamSearchUrl(keyword: string): string {
  const url = new URL(`${KREAM_API_BASE_URL}${KREAM_SEARCH_PATH}`);
  url.searchParams.set('keyword', keyword);
  return url.toString();
}

/**
 * Picks the best-matching KREAM product for `target`, scoring each candidate's
 * name fields with {@link computeMatchConfidence} and keeping the highest. Returns
 * null when nothing matches (confidence 0) or no candidate has an id.
 */
export function resolveKreamProduct(
  payload: KreamSearchResponse,
  target: MatchTarget,
): ResolvedKreamProduct | null {
  let best: ResolvedKreamProduct | null = null;

  for (const product of payload.items ?? []) {
    if (product.id == null) continue;
    const productId = String(product.id);
    if (!productId) continue;

    const confidence = Math.max(
      ...[product.name, product.translatedName, product.englishName].map((name) =>
        computeMatchConfidence(name, target),
      ),
    );

    if (confidence <= 0) continue;
    if (!best || confidence > best.confidence) {
      best = { productId, productUrl: KREAM_PRODUCT_URL(productId), confidence };
    }
  }

  return best;
}
