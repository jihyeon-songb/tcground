/**
 * KREAM rendered search-page extraction → asking snapshots.
 *
 * The KREAM JSON APIs can return 500 from automated contexts while the rendered
 * search page still exposes product cards. This adapter only handles pure
 * parsing/matching. Browser navigation lives in `scripts/collect-kream-search-page.ts`.
 */

import type { CardQuery } from '../collect-prices';
import { computeMatchConfidence, normalize } from '../match-confidence';
import type { SnapshotAggregate } from '../price-source.types';
import { KREAM_CURRENCY, KREAM_MARKET, KREAM_PRODUCT_URL, KREAM_SOURCE_NAME } from './kream-config';

export interface KreamSearchPageProduct {
  productId: string;
  productUrl: string;
  title: string;
  price: number;
  tradeCount: number | null;
}

export interface KreamSearchPageMatch {
  product: KreamSearchPageProduct;
  card: CardQuery;
  confidence: number;
}

export interface KreamSearchPageMapResult {
  snapshots: SnapshotAggregate[];
  matches: KreamSearchPageMatch[];
  skipped: Array<{ product: KreamSearchPageProduct; reason: string }>;
}

export const KREAM_BASE_SEARCH_KEYWORD = '포켓몬카드 한글판';

const DEFAULT_MIN_CONFIDENCE = 0.7;
const RARITY_TOKENS = ['SAR', 'SR', 'UR', 'AR', 'CHR', 'CSR', 'HR', 'RRR', 'RR', 'R'];

export function parseKreamSearchProductText(
  productId: string,
  rawText: string,
): KreamSearchPageProduct | null {
  const title = readTitle(rawText);
  const price = readPrice(rawText);
  if (!title || price === null) return null;

  return {
    productId,
    productUrl: KREAM_PRODUCT_URL(productId),
    title,
    price,
    tradeCount: readTradeCount(rawText),
  };
}

export function mapKreamSearchProductsToSnapshots(
  products: readonly KreamSearchPageProduct[],
  cards: readonly CardQuery[],
  snapshotDate: string,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
): KreamSearchPageMapResult {
  const snapshots: SnapshotAggregate[] = [];
  const matches: KreamSearchPageMatch[] = [];
  const skipped: KreamSearchPageMapResult['skipped'] = [];
  const usedCardIds = new Set<string>();

  for (const product of products) {
    const candidates = scoreProduct(product, cards)
      .filter((candidate) => candidate.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);

    const [best, second] = candidates;
    if (!best) {
      skipped.push({ product, reason: 'low_confidence' });
      continue;
    }
    if (second && second.confidence === best.confidence) {
      skipped.push({ product, reason: 'ambiguous_match' });
      continue;
    }
    if (usedCardIds.has(best.card.cardPrintingId)) {
      skipped.push({ product, reason: 'duplicate_card_match' });
      continue;
    }

    usedCardIds.add(best.card.cardPrintingId);
    matches.push(best);
    snapshots.push({
      cardPrintingId: best.card.cardPrintingId,
      snapshotDate,
      market: KREAM_MARKET,
      currency: KREAM_CURRENCY,
      variant: 'raw',
      conditionLabel: null,
      gradeCompany: null,
      gradeValue: null,
      avgPrice: product.price,
      minPrice: product.price,
      maxPrice: product.price,
      sampleCount: 1,
      sourceName: KREAM_SOURCE_NAME,
      sourceUrl: product.productUrl,
      aggregationMethod: 'kream_search_page_asking',
    });
  }

  return { snapshots, matches, skipped };
}

export function buildKreamSegmentedSearchKeywords(cards: readonly CardQuery[]): string[] {
  const keywords = new Map<string, string>();
  addKeyword(keywords, KREAM_BASE_SEARCH_KEYWORD);

  const rarityBySet = new Map<string, Set<string>>();
  for (const card of cards) {
    if (!card.setName) continue;
    addKeyword(keywords, `${card.setName} 한글판`);
    if (!card.rarity) continue;

    const rarities = rarityBySet.get(card.setName) ?? new Set<string>();
    rarities.add(card.rarity);
    rarityBySet.set(card.setName, rarities);
  }

  for (const [setName, rarities] of rarityBySet) {
    for (const rarity of Array.from(rarities).sort(sortRarity)) {
      addKeyword(keywords, `${setName} ${rarity} 한글판`);
    }
  }

  return Array.from(keywords.values());
}

function scoreProduct(
  product: KreamSearchPageProduct,
  cards: readonly CardQuery[],
): KreamSearchPageMatch[] {
  return cards.map((card) => ({
    product,
    card,
    confidence: hasRarityConflict(product.title, card.rarity)
      ? 0
      : computeMatchConfidence(product.title, {
          names: [card.cardName],
          collectorNumber: card.collectorNumber,
          setTokens: [card.setCode, card.setName, card.rarity],
        }),
  }));
}

function addKeyword(keywords: Map<string, string>, keyword: string): void {
  const normalized = normalize(keyword);
  if (normalized.length > 0 && !keywords.has(normalized)) {
    keywords.set(normalized, keyword);
  }
}

function sortRarity(a: string, b: string): number {
  const aIndex = RARITY_TOKENS.indexOf(a);
  const bIndex = RARITY_TOKENS.indexOf(b);
  if (aIndex !== -1 || bIndex !== -1) {
    return (
      (aIndex === -1 ? RARITY_TOKENS.length : aIndex) -
      (bIndex === -1 ? RARITY_TOKENS.length : bIndex)
    );
  }
  return a.localeCompare(b);
}

function hasRarityConflict(title: string, rarity: string | null): boolean {
  const normalizedTitle = normalize(title);
  const titleRarity = RARITY_TOKENS.find((token) => tokenMatches(normalizedTitle, token));
  if (!titleRarity) return false;
  return normalize(rarity) !== normalize(titleRarity);
}

function tokenMatches(normalizedTitle: string, token: string): boolean {
  return new Set(normalizedTitle.split(' ')).has(normalize(token));
}

function readTitle(rawText: string): string | null {
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines.find((line) => line.startsWith('포켓몬 TCG '));
  return title ?? null;
}

function readPrice(rawText: string): number | null {
  const match = rawText.match(/([\d,]+)\s*원/);
  if (!match) return null;
  const value = Number.parseInt(match[1].replace(/,/g, ''), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readTradeCount(rawText: string): number | null {
  const match = rawText.match(/거래\s*([\d,]+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1].replace(/,/g, ''), 10);
  return Number.isFinite(value) ? value : null;
}
