/**
 * eBay Marketplace Insights API adapter (completed sales → sold observations).
 *
 * This is the real `ebay_sold` source, but the Marketplace Insights API is a
 * Limited Release that requires an approved Application Growth Check — typically
 * unavailable to individual / hobby developers. This adapter is therefore a
 * SCAFFOLD: the mapping is implemented and tested so it can drop in once access
 * is granted, but `collectItemSales` refuses to call the API until access is
 * explicitly enabled.
 *
 * Until then, sold data comes from the manual CSV import path.
 */

import {
  ITEM_SALES_SEARCH_PATH,
  MARKETPLACE_INSIGHTS_SCOPE,
  loadEbayConfig,
  type EbayConfig,
} from './ebay-config';
import { getApplicationAccessToken } from './ebay-oauth';
import {
  EbayAccessNotGrantedError,
  type PriceMarket,
  type PriceObservationInput,
} from '../price-source.types';

export const MARKETPLACE_INSIGHTS_SOURCE_NAME = 'ebay_sold';

interface ItemSale {
  itemId?: string;
  title?: string;
  lastSoldPrice?: { value?: string; currency?: string };
  lastSoldDate?: string;
  condition?: string;
  conditionId?: string;
  totalSoldQuantity?: number;
  itemWebUrl?: string;
}

interface ItemSalesResponse {
  itemSales?: ItemSale[];
}

export interface MapItemSalesContext {
  cardPrintingId: string;
  market: PriceMarket;
  /** Card-match confidence assigned during keyword matching, 0..1. */
  confidenceScore: number;
  observedAt?: string;
}

export interface CollectItemSalesOptions {
  config?: EbayConfig;
  fetchImpl?: typeof fetch;
  /**
   * Must be explicitly true once Marketplace Insights access is granted.
   * Defaults to the `EBAY_MARKETPLACE_INSIGHTS_ENABLED` env flag.
   */
  accessGranted?: boolean;
}

/**
 * Maps Marketplace Insights item sales to sold observations.
 *
 * Data minimization: persists only price, date, condition, item id/url, and a
 * minimal payload. Seller/buyer identity and full raw content are never stored.
 */
export function mapItemSalesToObservations(
  payload: ItemSalesResponse,
  context: MapItemSalesContext,
): PriceObservationInput[] {
  const observedAt = context.observedAt ?? new Date().toISOString();

  return (payload.itemSales ?? [])
    .map((sale): PriceObservationInput | null => {
      const soldPrice = Number.parseFloat(sale.lastSoldPrice?.value ?? '');
      if (!Number.isFinite(soldPrice) || soldPrice <= 0) return null;
      if (!sale.lastSoldDate) return null;

      return {
        cardPrintingId: context.cardPrintingId,
        sourceName: MARKETPLACE_INSIGHTS_SOURCE_NAME,
        market: context.market,
        currency: sale.lastSoldPrice?.currency ?? 'USD',
        soldPrice,
        soldAt: sale.lastSoldDate,
        observedAt,
        conditionLabel: sale.condition ?? null,
        gradeCompany: null,
        gradeValue: null,
        variant: 'raw',
        listingTitle: sale.title ?? null,
        sourceUrl: sale.itemWebUrl ?? null,
        sourceItemId: sale.itemId ?? null,
        confidenceScore: context.confidenceScore,
        rawPayload: minimizePayload(sale),
      };
    })
    .filter((item): item is PriceObservationInput => item !== null);
}

/** Builds the Marketplace Insights item_sales/search URL. Pure. */
export function buildItemSalesSearchUrl(
  config: EbayConfig,
  keyword: string,
  limit: number,
): string {
  const url = new URL(`${config.apiBaseUrl}${ITEM_SALES_SEARCH_PATH}`);
  url.searchParams.set('q', keyword);
  url.searchParams.set('limit', String(limit));
  return url.toString();
}

/**
 * Calls Marketplace Insights for completed sales. Throws
 * {@link EbayAccessNotGrantedError} unless access has been explicitly granted,
 * since the API is restricted and individual approval is unlikely.
 */
export async function collectItemSales(
  keyword: string,
  context: MapItemSalesContext,
  options: CollectItemSalesOptions = {},
): Promise<PriceObservationInput[]> {
  const accessGranted =
    options.accessGranted ?? process.env.EBAY_MARKETPLACE_INSIGHTS_ENABLED === 'true';

  if (!accessGranted) {
    throw new EbayAccessNotGrantedError();
  }

  const config = options.config ?? loadEbayConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = await getApplicationAccessToken(MARKETPLACE_INSIGHTS_SCOPE, { config, fetchImpl });
  const url = buildItemSalesSearchUrl(config, keyword, 50);

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  });

  if (response.status === 403) {
    throw new EbayAccessNotGrantedError(
      'eBay Marketplace Insights returned 403 — application is not approved for buy.marketplace.insights',
    );
  }
  if (!response.ok) {
    throw new Error(`eBay Marketplace Insights search failed (${response.status})`);
  }

  const payload = (await response.json()) as ItemSalesResponse;
  return mapItemSalesToObservations(payload, context);
}

function minimizePayload(sale: ItemSale): Record<string, unknown> {
  return {
    conditionId: sale.conditionId ?? null,
    totalSoldQuantity: sale.totalSoldQuantity ?? null,
  };
}
