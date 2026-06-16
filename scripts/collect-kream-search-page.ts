/**
 * Collect KREAM current asking prices from the rendered search page.
 *
 * This is a fallback for KREAM's JSON endpoints returning 500 while the public
 * search page still renders product cards. It stores only matched asking
 * snapshots, never sold observations.
 *
 * Usage:
 *   KREAM_COLLECTION_ENABLED=true node --env-file=.env.local --import tsx scripts/collect-kream-search-page.ts
 *   add --dry-run to compute without DB writes.
 *   add --limit N to cap extracted products (default: no cap).
 *   add --segmented to search by catalog set/rarity keywords and dedupe products.
 *   add --max-keywords N to cap segmented keywords for tests.
 *   add --navigation-timeout-ms N to cap each navigation (default: 25000, segmented: 8000).
 *   add --search-timeout-ms N to cap each keyword wait (default: 20000, segmented: 5000).
 *   add --max-scrolls N to cap infinite-scroll attempts (default: 120, segmented: 0).
 */

import { createAdminClient } from '../lib/supabase/admin';
import {
  attachDisplayPrices,
  getCardQueries,
  upsertSnapshots,
} from '../lib/pricing/collect-prices';
import {
  KREAM_BASE_SEARCH_KEYWORD,
  buildKreamSegmentedSearchKeywords,
  mapKreamSearchProductsToSnapshots,
  parseKreamSearchProductText,
  type KreamSearchPageProduct,
} from '../lib/pricing/kream/search-page-adapter';
import { isKreamCollectionEnabled } from '../lib/pricing/kream/kream-config';

const KREAM_SEARCH_ORIGIN = 'https://kream.co.kr/search';

async function main(): Promise<void> {
  if (!isKreamCollectionEnabled()) {
    throw new Error('KREAM_COLLECTION_ENABLED=true is required');
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const segmented = args.includes('--segmented');
  const limit = parsePositiveIntOption(args, '--limit');
  const maxKeywords = parsePositiveIntOption(args, '--max-keywords');
  const maxScrolls = parseNonNegativeIntOption(args, '--max-scrolls') ?? (segmented ? 0 : 120);
  const queryDelayMs = parseNonNegativeIntOption(args, '--query-delay-ms') ?? 750;
  const navigationTimeoutMs =
    parsePositiveIntOption(args, '--navigation-timeout-ms') ?? (segmented ? 8000 : 25_000);
  const searchTimeoutMs =
    parsePositiveIntOption(args, '--search-timeout-ms') ?? (segmented ? 5000 : 20_000);
  const retryAttempts = segmented ? 1 : 3;
  const snapshotDate = new Date().toISOString().slice(0, 10);

  const supabase = createAdminClient();
  const cards = await getCardQueries(supabase);
  const keywords = (
    segmented ? buildKreamSegmentedSearchKeywords(cards) : [KREAM_BASE_SEARCH_KEYWORD]
  ).slice(0, maxKeywords);
  const products = await collectRenderedProductsForKeywords({
    keywords,
    limit,
    maxScrolls,
    queryDelayMs,
    navigationTimeoutMs,
    retryAttempts,
    searchTimeoutMs,
  });
  const mapped = mapKreamSearchProductsToSnapshots(products, cards, snapshotDate);
  const displaySnapshots = await attachDisplayPrices(supabase, mapped.snapshots, {});

  console.log(
    JSON.stringify(
      {
        dryRun,
        segmented,
        keywords: keywords.length,
        products: products.length,
        matches: mapped.matches.length,
        snapshots: displaySnapshots.length,
        skipped: summarizeSkipped(mapped.skipped),
        matchedProducts: mapped.matches.map((match) => ({
          productId: match.product.productId,
          title: match.product.title,
          price: match.product.price,
          tradeCount: match.product.tradeCount,
          confidence: match.confidence,
          cardPrintingId: match.card.cardPrintingId,
        })),
      },
      null,
      2,
    ),
  );

  if (!dryRun && displaySnapshots.length > 0) {
    const written = await upsertSnapshots(supabase, displaySnapshots);
    console.log(`[kream-search-page] upserted ${written} snapshots`);
  }
}

async function collectRenderedProductsForKeywords(options: {
  keywords: readonly string[];
  limit?: number;
  maxScrolls: number;
  queryDelayMs: number;
  navigationTimeoutMs: number;
  retryAttempts: number;
  searchTimeoutMs: number;
}): Promise<KreamSearchPageProduct[]> {
  const page = await createKreamPage();
  const products = new Map<string, KreamSearchPageProduct>();

  try {
    for (const keyword of options.keywords) {
      if (options.limit && products.size >= options.limit) break;

      const remainingLimit = options.limit ? options.limit - products.size : undefined;
      const keywordProducts = await collectRenderedProductsFromPage(page, {
        keyword,
        limit: remainingLimit,
        maxScrolls: options.maxScrolls,
        navigationTimeoutMs: options.navigationTimeoutMs,
        retryAttempts: options.retryAttempts,
        searchTimeoutMs: options.searchTimeoutMs,
      });

      for (const product of keywordProducts) {
        products.set(product.productId, product);
      }

      if (options.queryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.queryDelayMs));
      }
    }
  } finally {
    await page.browser.close();
  }

  return Array.from(products.values());
}

async function createKreamPage(): Promise<PlaywrightPage> {
  const moduleName = 'playwright';
  const { chromium } = (await import(moduleName)) as { chromium: PlaywrightChromium };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: 'ko-KR',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  return Object.assign(page, { browser });
}

async function collectRenderedProductsFromPage(
  page: PlaywrightPage,
  options: {
    keyword: string;
    limit?: number;
    maxScrolls: number;
    navigationTimeoutMs?: number;
    retryAttempts?: number;
    searchTimeoutMs?: number;
  },
): Promise<KreamSearchPageProduct[]> {
  const loaded = await gotoSearchWithRetry(page, options.keyword, {
    navigationTimeoutMs: options.navigationTimeoutMs ?? 25_000,
    retryAttempts: options.retryAttempts ?? 3,
    searchTimeoutMs: options.searchTimeoutMs ?? 20_000,
  });
  if (!loaded) return [];

  await scrollUntilStable(page, options);

  const rawProducts = await readRawProducts(page);
  const byProductId = new Map<string, KreamSearchPageProduct>();
  for (const raw of rawProducts) {
    const productId = raw.href.match(/\/products\/(\d+)/)?.[1];
    if (!productId || byProductId.has(productId)) continue;
    const parsed = parseKreamSearchProductText(productId, raw.text);
    if (!parsed) continue;
    byProductId.set(productId, parsed);
    if (options.limit && byProductId.size >= options.limit) break;
  }

  return Array.from(byProductId.values());
}

async function gotoSearchWithRetry(
  page: PlaywrightPage,
  keyword: string,
  options: { navigationTimeoutMs: number; retryAttempts: number; searchTimeoutMs: number },
): Promise<boolean> {
  for (let attempt = 1; attempt <= options.retryAttempts; attempt += 1) {
    try {
      await page.goto(buildSearchUrl(keyword), {
        waitUntil: 'domcontentloaded',
        timeout: options.navigationTimeoutMs,
      });
      if (await waitForProductLinks(page, options.searchTimeoutMs)) return true;
    } catch {
      // KREAM intermittently returns 500/empty responses to automated browsers.
      // Retry from a fresh navigation before giving up for this run.
    }
    await page.waitForTimeout(attempt * 2000);
  }

  return false;
}

function buildSearchUrl(keyword: string): string {
  const url = new URL(KREAM_SEARCH_ORIGIN);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('footer', 'home');
  return url.toString();
}

async function waitForProductLinks(page: PlaywrightPage, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await countProductLinks(page)) > 0) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

async function scrollUntilStable(
  page: PlaywrightPage,
  options: { limit?: number; maxScrolls: number },
): Promise<void> {
  let previousCount = await countProductLinks(page);
  let stableRounds = 0;

  for (let i = 0; i < options.maxScrolls; i += 1) {
    if (options.limit && previousCount >= options.limit) break;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(700);

    const currentCount = await countProductLinks(page);
    if (currentCount > previousCount) {
      previousCount = currentCount;
      stableRounds = 0;
      continue;
    }

    stableRounds += 1;
    if (stableRounds >= 4) break;
  }
}

async function countProductLinks(page: PlaywrightPage): Promise<number> {
  return page.$$eval('a[href^="/products/"]', (links) => {
    const ids = new Set<string>();
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      const productId = href.match(/\/products\/(\d+)/)?.[1];
      if (productId) ids.add(productId);
    }
    return ids.size;
  });
}

async function readRawProducts(
  page: PlaywrightPage,
): Promise<Array<{ href: string; text: string }>> {
  return page.$$eval('a[href^="/products/"]', (links) =>
    links.map((link) => ({
      href: link.getAttribute('href') ?? '',
      text: link.innerText,
    })),
  );
}

function summarizeSkipped(
  skipped: ReturnType<typeof mapKreamSearchProductsToSnapshots>['skipped'],
) {
  return skipped.reduce<Record<string, number>>((summary, item) => {
    summary[item.reason] = (summary[item.reason] ?? 0) + 1;
    return summary;
  }, {});
}

function parsePositiveIntOption(args: readonly string[], flag: string): number | undefined {
  const value = parseIntegerOption(args, flag);
  if (value === undefined) return undefined;
  if (value <= 0) throw new Error(`${flag} requires a positive integer value`);
  return value;
}

function parseNonNegativeIntOption(args: readonly string[], flag: string): number | undefined {
  const value = parseIntegerOption(args, flag);
  if (value === undefined) return undefined;
  if (value < 0) throw new Error(`${flag} requires a non-negative integer value`);
  return value;
}

function parseIntegerOption(args: readonly string[], flag: string): number | undefined {
  const index = args.lastIndexOf(flag);
  if (index === -1) return undefined;

  const raw = args[index + 1];
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${flag} requires an integer value`);
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

interface PlaywrightChromium {
  launch(options?: { headless?: boolean }): Promise<PlaywrightBrowser>;
}

interface PlaywrightBrowser {
  newPage(options?: { locale?: string; userAgent?: string }): Promise<PlaywrightPage>;
  close(): Promise<void>;
}

interface PlaywrightPage {
  browser: PlaywrightBrowser;
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  $$eval<T>(
    selector: string,
    fn: (
      elements: Array<{
        getAttribute(name: string): string | null;
        innerText: string;
      }>,
    ) => T,
  ): Promise<T>;
}
