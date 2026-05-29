/**
 * Shared contract for TCGround price source adapters.
 *
 * Every price source — manual CSV import, eBay Browse (asking), eBay Marketplace
 * Insights (sold, restricted) — normalizes its output to these shapes so sources
 * can be swapped without touching aggregation, persistence, or the chart.
 *
 * Field shapes mirror the Supabase `price_observations` / `card_price_snapshots`
 * tables defined in `memory-bank/db-schema.md`.
 */

/** Price market. Markets are never mixed or currency-converted during aggregation. */
export type PriceMarket = 'KR' | 'JP' | 'NA';

/** Whether a price point is a completed sale or a current asking price. */
export type PriceKind = 'sold' | 'asking';

/** Price bucket: ungraded ("raw") vs professionally graded. */
export type PriceVariant = 'raw' | 'graded';

/**
 * A single raw observation ready to insert into `price_observations`.
 * `cardPrintingId` is already resolved to a catalog `card_printings.id`.
 */
export interface PriceObservationInput {
  cardPrintingId: string;
  sourceName: string;
  market: PriceMarket;
  currency: string;
  soldPrice: number;
  /** ISO timestamp of the transaction. */
  soldAt: string;
  /** ISO timestamp the observation was collected. */
  observedAt: string;
  conditionLabel: string | null;
  gradeCompany: string | null;
  gradeValue: string | null;
  variant: PriceVariant;
  listingTitle: string | null;
  sourceUrl: string | null;
  sourceItemId: string | null;
  /** Card-match confidence, 0..1. Low-confidence rows are dropped before aggregation. */
  confidenceScore: number;
  /** Minimized source payload. Never stores seller/buyer identity or full raw content. */
  rawPayload: Record<string, unknown>;
}

/**
 * Hint used to resolve a `card_printings.id` for an observation whose source only
 * knows human-facing identifiers (CSV import, scraped/parsed listings).
 */
export interface CardPrintingMatchHint {
  sampleId: string;
  setCode: string | null;
  collectorNumber: string | null;
  language: string | null;
  region: string | null;
  finish: string | null;
}

/** A CSV/source row parsed but not yet resolved to a `card_printings.id`. */
export interface ParsedPriceObservation {
  match: CardPrintingMatchHint;
  priceKind: PriceKind;
  observation: Omit<PriceObservationInput, 'cardPrintingId'>;
}

/**
 * A daily, per-bucket price summary ready to upsert into `card_price_snapshots`.
 * This is the shape the card-detail chart reads.
 */
export interface SnapshotAggregate {
  cardPrintingId: string;
  /** `YYYY-MM-DD`. */
  snapshotDate: string;
  market: PriceMarket;
  currency: string;
  variant: PriceVariant;
  conditionLabel: string | null;
  gradeCompany: string | null;
  gradeValue: string | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  sampleCount: number;
  sourceName: string;
  sourceUrl: string | null;
  aggregationMethod: string;
}

/**
 * A price source adapter. Sold sources (`priceKind: 'sold'`) feed
 * `price_observations`; asking sources (`priceKind: 'asking'`) produce daily
 * `SnapshotAggregate`s directly.
 */
export interface PriceSourceAdapter {
  sourceName: string;
  market: PriceMarket;
  priceKind: PriceKind;
  /** True for restricted sources (e.g. eBay Marketplace Insights) that need approval. */
  requiresApproval: boolean;
}

/** Thrown when a restricted source is invoked without granted API access. */
export class EbayAccessNotGrantedError extends Error {
  constructor(message = 'eBay restricted API access has not been granted for this application') {
    super(message);
    this.name = 'EbayAccessNotGrantedError';
  }
}
