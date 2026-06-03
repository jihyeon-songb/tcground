/**
 * eBay sold-listing scrape adapter (completed sales → sold observations).
 *
 * The real sold source — Marketplace Insights — is a restricted Limited Release
 * unavailable to individual developers (see `marketplace-insights-adapter.ts`).
 * This adapter instead parses eBay's public sold/completed search results page.
 *
 * GATED: parsing is implemented and tested against a fixed HTML fixture, but
 * `collectEbayScrape` refuses to fetch the network until `EBAY_SCRAPE_ENABLED`
 * is explicitly set, since scraping has ToS considerations. It is a distinct
 * source (`ebay_scrape`) so it never collides with `ebay_sold` (Insights).
 *
 * Data minimization: only price, sold date, title, item id/url and a minimal
 * payload are kept. Seller/buyer identity and full raw content are never stored.
 */

import {
  EBAY_SOLD_SEARCH_PATH,
  EBAY_TCG_CATEGORY_ID,
  EBAY_WEB_BASE_URL,
} from './ebay-config';
import { parseGradeLabel } from '../grade-parse';
import { computeMatchConfidence, type MatchTarget } from '../match-confidence';
import {
  PriceSourceAccessNotGrantedError,
  type PriceMarket,
  type PriceObservationInput,
} from '../price-source.types';

export const EBAY_SCRAPE_SOURCE_NAME = 'ebay_scrape';

export interface EbayScrapeContext {
  cardPrintingId: string;
  /** eBay.com sold prices bucket under USD/NA by default. */
  market?: PriceMarket;
  /**
   * The card each listing is matched against. Per-listing confidence is computed
   * from the listing title so accessories/wrong cards score low and get dropped
   * during aggregation, instead of every listing sharing one flat score.
   */
  target: MatchTarget;
  observedAt?: string;
}

export interface CollectEbayScrapeOptions {
  fetchImpl?: typeof fetch;
  /**
   * Must be explicitly true once eBay scraping is approved for use.
   * Defaults to the `EBAY_SCRAPE_ENABLED` env flag.
   */
  accessGranted?: boolean;
}

/** Builds the eBay sold/completed search URL for a keyword, scoped to TCG. Pure. */
export function buildEbaySoldSearchUrl(keyword: string): string {
  const url = new URL(`${EBAY_WEB_BASE_URL}${EBAY_SOLD_SEARCH_PATH}`);
  url.searchParams.set('_nkw', keyword);
  url.searchParams.set('LH_Sold', '1');
  url.searchParams.set('LH_Complete', '1');
  // Constrain to the trading-card category so accessories/other categories
  // never enter the sold results in the first place.
  url.searchParams.set('_sacat', EBAY_TCG_CATEGORY_ID);
  return url.toString();
}

const ITEM_BLOCK_RE = /<li[^>]*class="[^"]*s-item[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
const TITLE_RE = /<(?:span|div)[^>]*role="heading"[^>]*>([\s\S]*?)<\/(?:span|div)>/;
const PRICE_RE = /<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]*?)<\/span>/;
const SOLD_RE = /<span[^>]*class="[^"]*s-item__caption--signal[^"]*"[^>]*>([\s\S]*?)<\/span>/;
const LINK_RE = /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/;

/**
 * Parses an eBay sold-search results page into sold observations. Skips blocks
 * without a usable price, sold date, or item id.
 */
export function parseEbaySoldHtml(
  html: string,
  context: EbayScrapeContext,
): PriceObservationInput[] {
  const observedAt = context.observedAt ?? new Date().toISOString();
  const market = context.market ?? 'NA';
  const observations: PriceObservationInput[] = [];

  for (const match of html.matchAll(ITEM_BLOCK_RE)) {
    const block = match[1];

    const title = decodeEntities(stripInnerTags(TITLE_RE.exec(block)?.[1] ?? '')).trim();
    if (!title) continue;

    const priceText = stripInnerTags(PRICE_RE.exec(block)?.[1] ?? '');
    const soldPrice = parsePrice(priceText);
    if (soldPrice === null) continue;

    const soldAt = parseSoldDate(stripInnerTags(SOLD_RE.exec(block)?.[1] ?? ''));
    if (!soldAt) continue;

    const href = LINK_RE.exec(block)?.[1] ?? null;
    const itemId = href ? (href.match(/\/itm\/(\d+)/)?.[1] ?? null) : null;
    if (!itemId) continue;

    const { variant, gradeCompany, gradeValue } = parseGradeLabel(title);

    observations.push({
      cardPrintingId: context.cardPrintingId,
      sourceName: EBAY_SCRAPE_SOURCE_NAME,
      market,
      currency: parseCurrency(priceText),
      soldPrice,
      soldAt,
      observedAt,
      conditionLabel: null,
      gradeCompany,
      gradeValue,
      variant,
      listingTitle: title,
      sourceUrl: href ? stripQuery(href) : null,
      sourceItemId: itemId,
      confidenceScore: computeMatchConfidence(title, context.target),
      rawPayload: { itemId },
    });
  }

  return observations;
}

/**
 * Fetches and parses eBay sold listings for one keyword. Throws
 * {@link PriceSourceAccessNotGrantedError} unless scraping is explicitly enabled.
 */
export async function collectEbayScrape(
  keyword: string,
  context: EbayScrapeContext,
  options: CollectEbayScrapeOptions = {},
): Promise<PriceObservationInput[]> {
  const accessGranted = options.accessGranted ?? process.env.EBAY_SCRAPE_ENABLED === 'true';
  if (!accessGranted) {
    throw new PriceSourceAccessNotGrantedError(EBAY_SCRAPE_SOURCE_NAME);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(buildEbaySoldSearchUrl(keyword), {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });

  if (!response.ok) {
    throw new Error(`eBay sold scrape failed (${response.status})`);
  }

  const html = await response.text();
  return parseEbaySoldHtml(html, context);
}

/** Parses a price string like "$210.00" or "US $1,234.56" into a number. */
function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Picks an ISO-4217 currency from a price string. Defaults to USD. */
function parseCurrency(text: string): string {
  if (text.includes('£') || /\bGBP\b/.test(text)) return 'GBP';
  if (text.includes('€') || /\bEUR\b/.test(text)) return 'EUR';
  return 'USD';
}

/** Parses an eBay "Sold  Mar 27, 2026" caption into an ISO timestamp, or null. */
function parseSoldDate(text: string): string | null {
  const cleaned = text.replace(/sold/i, '').trim();
  if (!cleaned) return null;
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function stripInnerTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function stripQuery(url: string): string {
  const index = url.indexOf('?');
  return index === -1 ? url : url.slice(0, index);
}
