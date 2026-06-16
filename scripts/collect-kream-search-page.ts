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
 *   add --max-scrolls N to cap infinite-scroll attempts (default: 120).
 */

import { createAdminClient } from '../lib/supabase/admin';
import {
  attachDisplayPrices,
  getCardQueries,
  upsertSnapshots,
} from '../lib/pricing/collect-prices';
import {
  mapKreamSearchProductsToSnapshots,
  parseKreamSearchProductText,
  type KreamSearchPageProduct,
} from '../lib/pricing/kream/search-page-adapter';
import { isKreamCollectionEnabled } from '../lib/pricing/kream/kream-config';

const SEARCH_URL =
  'https://kream.co.kr/search?keyword=%ED%8F%AC%EC%BC%93%EB%AA%AC%EC%B9%B4%EB%93%9C+%ED%95%9C%EA%B8%80%ED%8C%90&footer=home';

async function main(): Promise<void> {
  if (!isKreamCollectionEnabled()) {
    throw new Error('KREAM_COLLECTION_ENABLED=true is required');
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = parsePositiveIntOption(args, '--limit');
  const maxScrolls = parsePositiveIntOption(args, '--max-scrolls') ?? 120;
  const snapshotDate = new Date().toISOString().slice(0, 10);

  const supabase = createAdminClient();
  const cards = await getCardQueries(supabase);
  const products = await collectRenderedProducts({ limit, maxScrolls });
  const mapped = mapKreamSearchProductsToSnapshots(products, cards, snapshotDate);
  const displaySnapshots = await attachDisplayPrices(supabase, mapped.snapshots, {});

  console.log(
    JSON.stringify(
      {
        dryRun,
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

async function collectRenderedProducts(options: {
  limit?: number;
  maxScrolls: number;
}): Promise<KreamSearchPageProduct[]> {
  const moduleName = 'playwright';
  const { chromium } = (await import(moduleName)) as { chromium: PlaywrightChromium };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: 'ko-KR',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  try {
    const loaded = await gotoSearchWithRetry(page);
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
  } finally {
    await browser.close();
  }
}

async function gotoSearchWithRetry(page: PlaywrightPage): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });
      if (await waitForProductLinks(page, 20_000)) return true;
    } catch {
      // KREAM intermittently returns 500/empty responses to automated browsers.
      // Retry from a fresh navigation before giving up for this run.
    }
    await page.waitForTimeout(attempt * 2000);
  }

  return false;
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

function parseIntegerOption(args: readonly string[], flag: string): number | undefined {
  const index = args.indexOf(flag);
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
