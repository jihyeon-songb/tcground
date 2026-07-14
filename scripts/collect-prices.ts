/**
 * Local price collection / import script (verification + manual sold import).
 *
 * Usage (Node 20+ loads env from .env.local):
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts            # all enabled sources
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --guardian
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --browse  # ebay_browse + ebay_auction (1 call/card)
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --kream    # KREAM asking; needs KREAM_COLLECTION_ENABLED
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --bunjang  # needs BUNJANG_COLLECTION_ENABLED
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --joongna  # needs JOONGNA_COLLECTION_ENABLED
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --ebay-scrape # needs EBAY_SCRAPE_ENABLED
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --csv
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --csv-asking
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --csv --fx
 *   add --dry-run to compute without writing to the DB.
 *   add --offset N --limit N to verify/retry a catalog window.
 *   add --daily-window-size N to process a rotating daily catalog window.
 *   add --source-batch-size N to write one run record per source batch.
 *
 * Source flags (--browse/--guardian/--kream/--bunjang/--joongna/--ebay-scrape) restrict the
 * run to those sources; with none, every *enabled* source runs (same as cron).
 * `--csv` imports verified sold rows from memory-bank/price-source-validation.csv;
 * `--csv-asking` imports asking rows. `--fx` fetches/stores Korea Eximbank FX
 * rates for foreign-currency import dates before building KRW display snapshots.
 * Gated sources are skipped unless their flag is on.
 *
 * Browser sources (KREAM, eBay scrape) are blocked from datacenter IPs, so this
 * script drives them through a headless Chromium (Playwright). They run only when
 * a browser fetch is injected here — never on the Vercel Cron route. Requires
 * `npx playwright install chromium` and a residential / Korean IP.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import {
  attachDisplayPrices,
  collectDailyPrices,
  getSampleIdToPrintingId,
  insertPriceObservations,
  upsertExchangeRates,
  upsertSnapshots,
} from '../lib/pricing/collect-prices';
import {
  parseAskingValidationCsv,
  parsePriceValidationCsv,
  resolveCardPrintingIds,
} from '../lib/pricing/csv-import';
import {
  aggregateAskingObservations,
  aggregateObservationsBySource,
} from '../lib/pricing/aggregate';
import { fetchKoreaEximExchangeRates, type ExchangeRateInput } from '../lib/pricing/fx';
import type { ParsedPriceObservation } from '../lib/pricing/price-source.types';

/** Maps a CLI flag to its source name. */
const SOURCE_FLAGS: Record<string, string> = {
  // `--browse` collects both fixed-price (ebay_browse) and auction (ebay_auction)
  // snapshots in one Browse call per card; there is no separate `--auction` flag.
  '--browse': 'ebay_browse',
  '--bunjang': 'bunjang',
  '--joongna': 'joongna',
  '--guardian': 'guardian_tcg',
  '--kream': 'kream',
  '--ebay-scrape': 'ebay_scrape',
};

/** Sources that need a real browser session (and thus an injected browser fetch). */
const BROWSER_SOURCE_NAMES = new Set(['kream', 'ebay_scrape']);

/** Origins warmed up before browser requests so their cookies/anti-bot tokens are set. */
const BROWSER_WARMUP_URLS = ['https://kream.co.kr/', 'https://www.ebay.com/'];

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const runCsv = args.has('--csv');
  const runCsvAsking = args.has('--csv-asking');
  const runFx = args.has('--fx');
  const cliArgs = process.argv.slice(2);
  const cardOffset = parseNonNegativeIntOption(cliArgs, '--offset') ?? 0;
  const cardLimit = parsePositiveIntOption(cliArgs, '--limit');
  const dailyWindowSize = parsePositiveIntOption(cliArgs, '--daily-window-size');
  const sourceBatchSize = parsePositiveIntOption(cliArgs, '--source-batch-size');

  const only = Object.entries(SOURCE_FLAGS)
    .filter(([flag]) => args.has(flag))
    .map(([, sourceName]) => sourceName);

  // Run collection when a source flag is given, or when no CSV flag was given.
  const runCollect = only.length > 0 || (!runCsv && !runCsvAsking);

  const supabase = createAdminClient();
  const csvPath = join(process.cwd(), 'memory-bank', 'price-source-validation.csv');
  const needsCsv = runCsv || runCsvAsking || runFx;
  const csvContent = needsCsv ? readFileSync(csvPath, 'utf8') : '';
  const parsedSold = runCsv || runFx ? parsePriceValidationCsv(csvContent) : [];
  const parsedAsking = runCsvAsking || runFx ? parseAskingValidationCsv(csvContent) : [];

  let exchangeRates: ExchangeRateInput[] | undefined;
  if (runFx) {
    const dates = collectFxDates([...parsedSold, ...parsedAsking], runCollect);
    try {
      exchangeRates = await fetchAndStoreExchangeRates(supabase, dates, dryRun);
    } catch (error) {
      // A failed FX refresh must not abort price collection: downstream
      // conversion falls back to the most recent rate already in the DB.
      console.error('[fx] refresh failed, continuing with stored rates:', error);
    }
  }

  if (runCsv) {
    const printingIds = await getSampleIdToPrintingId(supabase);
    const observations = resolveCardPrintingIds(parsedSold, printingIds);
    const snapshots = await attachDisplayPrices(
      supabase,
      aggregateObservationsBySource(observations),
      {
        exchangeRates,
      },
    );

    console.log(
      `[csv] parsed=${parsedSold.length} resolved=${observations.length} snapshots=${snapshots.length} dryRun=${dryRun}`,
    );
    if (!dryRun && observations.length > 0) {
      const inserted = await insertPriceObservations(supabase, observations);
      console.log(`[csv] inserted ${inserted} sold observations`);
    }
    if (!dryRun && snapshots.length > 0) {
      const written = await upsertSnapshots(supabase, snapshots);
      console.log(`[csv] upserted ${written} sold snapshots`);
    }
  }

  if (runCsvAsking) {
    const printingIds = await getSampleIdToPrintingId(supabase);
    const observations = resolveCardPrintingIds(parsedAsking, printingIds);
    const snapshots = await attachDisplayPrices(
      supabase,
      aggregateAskingObservations(observations),
      { exchangeRates },
    );

    console.log(
      `[csv-asking] parsed=${parsedAsking.length} resolved=${observations.length} snapshots=${snapshots.length} dryRun=${dryRun}`,
    );
    if (!dryRun && snapshots.length > 0) {
      const written = await upsertSnapshots(supabase, snapshots);
      console.log(`[csv-asking] upserted ${written} asking snapshots`);
    }
  }

  if (runCollect) {
    // Launch a browser only when the run may include a browser source (KREAM /
    // eBay scrape): explicitly selected, or all-enabled with the flags on.
    const needsBrowser =
      only.length > 0 ? only.some((source) => BROWSER_SOURCE_NAMES.has(source)) : true;

    let browser: { fetch: typeof fetch; close: () => Promise<void> } | null = null;
    if (needsBrowser) {
      const { createBrowserFetch } = await import('../lib/pricing/browser/browser-fetch');
      browser = await createBrowserFetch({ warmupUrls: BROWSER_WARMUP_URLS });
    }

    try {
      console.log(
        `[collect] dryRun=${dryRun} sources=${only.length > 0 ? only.join(',') : 'enabled'} offset=${cardOffset} limit=${cardLimit ?? 'all'} dailyWindowSize=${dailyWindowSize ?? 'off'} sourceBatchSize=${sourceBatchSize ?? 'all'}`,
      );
      const result = await collectDailyPrices(supabase, {
        dryRun,
        only: only.length > 0 ? only : undefined,
        fetchImpl: browser?.fetch,
        exchangeRates,
        cardOffset,
        cardLimit,
        dailyWindowSize,
        sourceBatchSize,
        onProgress: (event) => {
          const range = `${event.cardStart}-${event.cardEnd}`;
          const status = event.status ? ` status=${event.status}` : '';
          console.log(
            `[collect:${event.sourceName}] batch=${event.batchIndex}/${event.batchCount} cards=${range} count=${event.cardCount}${status}`,
          );
        },
      });
      console.log('[collect]', JSON.stringify(result, null, 2));
    } finally {
      await browser?.close();
    }
  }

  // Rebuild precomputed rankings so today's snapshots are reflected. The catalog
  // reads these matviews (not the raw snapshot table) to stay under the anon 3s
  // statement_timeout; stale matviews just mean yesterday's ranking.
  if (!dryRun) {
    const { error } = await supabase.rpc('refresh_card_price_sample_count_rank');
    if (error) {
      console.error('[rank] refresh_card_price_sample_count_rank failed:', error.message);
    } else {
      console.log('[rank] refreshed card_price_sample_count_rank');
    }

    const { error: askingPriceError } = await supabase.rpc(
      'refresh_card_average_asking_price_rank',
    );
    if (askingPriceError) {
      console.error(
        '[rank] refresh_card_average_asking_price_rank failed:',
        askingPriceError.message,
      );
    } else {
      console.log('[rank] refreshed card_average_asking_price_rank');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function collectFxDates(
  parsed: readonly ParsedPriceObservation[],
  includeToday: boolean,
): string[] {
  const dates = new Set<string>();
  for (const item of parsed) {
    if (item.observation.currency === 'KRW') continue;
    const date = toDateString(item.observation.soldAt);
    if (date) dates.add(date);
  }
  if (includeToday) dates.add(new Date().toISOString().slice(0, 10));
  return Array.from(dates).sort();
}

async function fetchAndStoreExchangeRates(
  supabase: ReturnType<typeof createAdminClient>,
  dates: readonly string[],
  dryRun: boolean,
): Promise<ExchangeRateInput[]> {
  if (dates.length === 0) return [];

  const allRates: ExchangeRateInput[] = [];
  for (const rateDate of dates) {
    const rates = await fetchKoreaEximExchangeRates({ rateDate });
    console.log(`[fx] fetched date=${rateDate} rates=${rates.length}`);
    allRates.push(...rates);
  }

  if (!dryRun && allRates.length > 0) {
    const written = await upsertExchangeRates(supabase, allRates);
    console.log(`[fx] upserted ${written} exchange-rate rows`);
  }

  return allRates;
}

function toDateString(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parsePositiveIntOption(args: readonly string[], flag: string): number | undefined {
  const value = parseIntegerOption(args, flag);
  if (value === undefined) return undefined;
  if (value <= 0) {
    throw new Error(`${flag} requires a positive integer value`);
  }
  return value;
}

function parseNonNegativeIntOption(args: readonly string[], flag: string): number | undefined {
  const value = parseIntegerOption(args, flag);
  if (value === undefined) return undefined;
  if (value < 0) {
    throw new Error(`${flag} requires a non-negative integer value`);
  }
  return value;
}

function parseIntegerOption(args: readonly string[], flag: string): number | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;

  const raw = args[index + 1];
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${flag} requires an integer value`);
  }

  return value;
}
