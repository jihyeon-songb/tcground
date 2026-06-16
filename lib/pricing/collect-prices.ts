/**
 * Daily price collection orchestration.
 *
 * Loads the catalog cards and runs every *enabled* price source over them:
 *   - eBay Browse / KREAM / domestic listing sources → daily asking snapshots
 *   - gated domestic/listing scaffolds → disabled unless compliant access is enabled
 *   - manual sold/asking evidence → imported through `scripts/collect-prices.ts --csv*`
 *
 * Each source is independently gated: it only runs when its credentials / enable
 * flag are present, so the cron route can call `collectDailyPrices()` with no
 * config and simply collect whatever is configured. A single card or source
 * failure never aborts the whole run; results are upserted into
 * `card_price_snapshots` and one `price_collection_runs` row is written per
 * source. Shared by the Vercel Cron route and `scripts/collect-prices.ts`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectBrowseSnapshot, BROWSE_SOURCE_NAME } from './ebay/browse-adapter';
import { collectEbayScrape, EBAY_SCRAPE_SOURCE_NAME } from './ebay/scrape-adapter';
import { collectBunjangSnapshots } from './bunjang/bunjang-adapter';
import {
  BUNJANG_SOURCE_NAME,
  isBunjangCollectionEnabled,
  BUNJANG_MARKET,
} from './bunjang/bunjang-config';
import { collectJoongnaSnapshots } from './joongna/joongna-adapter';
import {
  JOONGNA_MARKET,
  JOONGNA_SOURCE_NAME,
  isJoongnaCollectionEnabled,
} from './joongna/joongna-config';
import { collectKreamAskingSnapshots, resolveKreamProductByName } from './kream/kream-adapter';
import { KREAM_SOURCE_NAME, isKreamCollectionEnabled, KREAM_MARKET } from './kream/kream-config';
import type { MatchTarget } from './match-confidence';
import { collectGuardianSnapshots } from './guardian/guardian-adapter';
import {
  GUARDIAN_SOURCE_NAME,
  isGuardianCollectionEnabled,
  GUARDIAN_MARKET,
} from './guardian/guardian-config';
import { aggregateObservations } from './aggregate';
import type { PriceMarket, PriceObservationInput, SnapshotAggregate } from './price-source.types';
import {
  DEFAULT_DISPLAY_CURRENCY,
  applyDisplayCurrencyToSnapshots,
  type ExchangeRateInput,
} from './fx';

/** Default card-match confidence for keyword-resolved automated sources. */
export const DEFAULT_QUERY_CONFIDENCE = 0.75;

export interface SourceRunResult {
  sourceName: string;
  snapshotsUpserted: number;
  observationsCollected: number;
  failures: Array<{ cardPrintingId: string; error: string }>;
  status: 'succeeded' | 'partial' | 'failed' | 'skipped';
}

export interface CollectPricesResult {
  cardsProcessed: number;
  snapshotsUpserted: number;
  failures: Array<{ cardPrintingId: string; error: string }>;
  status: 'succeeded' | 'partial' | 'failed';
  sources: SourceRunResult[];
}

export interface CollectPricesOptions {
  /** When true, computes snapshots but does not write to the DB (rehearsal). */
  dryRun?: boolean;
  snapshotDate?: string;
  fetchImpl?: typeof fetch;
  /** Optional local-run offset for retrying a catalog window. */
  cardOffset?: number;
  /** Optional local-run guard for verifying or retrying a catalog subset. */
  cardLimit?: number;
  /**
   * Optional daily rotating catalog window size. Useful for launchd/Vercel cron:
   * each date processes one deterministic slice instead of the full catalog.
   */
  dailyWindowSize?: number;
  /** Optional date override for tests. Defaults to the snapshot date. */
  dailyWindowDate?: string;
  /** Optional per-source batch size. Each batch writes its own run record. */
  sourceBatchSize?: number;
  /** Restrict the run to these source names (defaults to all enabled sources). */
  only?: readonly string[];
  /** Preloaded FX rows. When omitted, `exchange_rates` is read as needed. */
  exchangeRates?: readonly ExchangeRateInput[];
  /** Display currency for converted price summaries. Defaults to KRW. */
  displayCurrency?: string;
  /** Optional progress hook used by the local CLI for long-running sources. */
  onProgress?: (event: SourceBatchProgress) => void;
}

export interface SourceBatchProgress {
  sourceName: string;
  batchIndex: number;
  batchCount: number;
  cardOffset: number;
  cardStart: number;
  cardEnd: number;
  cardCount: number;
  status?: SourceRunResult['status'];
}

interface CardPrintingPick {
  id: string;
  collector_number: string | null;
  language: string | null;
  region: string | null;
  set_name: string | null;
  set_code: string | null;
  rarity: string | null;
  external_ids: Record<string, unknown> | null;
}

interface CardCatalogRow {
  name: string;
  card_printings: CardPrintingPick[];
}

/** A catalog card resolved into the fields every source needs to query it. */
export interface CardQuery {
  cardPrintingId: string;
  cardName: string;
  collectorNumber: string | null;
  /** English card name (TCGdex `external_ids.name_en`); null for JP-only sets. */
  nameEn: string | null;
  /** Japanese card name (TCGdex `external_ids.name_ja`); null when unavailable. */
  nameJa: string | null;
  /** Set name / code tokens for relevance scoring. */
  setName: string | null;
  setCode: string | null;
  rarity: string | null;
  /** KREAM product URL from `external_ids`, when mapped; null otherwise. */
  kreamProductUrl: string | null;
}

/** Supabase caps a single select at 1000 rows, so the catalog is paged. */
const CARD_PAGE_SIZE = 1000;

/** Loads catalog cards as per-source queries, preferring the Korean printing. */
export async function getCardQueries(supabase: SupabaseClient): Promise<CardQuery[]> {
  const queries: CardQuery[] = [];

  for (let from = 0; ; from += CARD_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('cards')
      .select(
        'name, card_printings(id, collector_number, language, region, set_name, set_code, rarity, external_ids)',
      )
      .order('slug', { ascending: true })
      .range(from, from + CARD_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load catalog cards: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as CardCatalogRow[];
    for (const row of rows) {
      const printing = pickPrimaryPrinting(row.card_printings);
      if (!printing) continue;
      queries.push({
        cardPrintingId: printing.id,
        cardName: row.name,
        collectorNumber: printing.collector_number,
        nameEn: readStringId(printing.external_ids, 'name_en'),
        nameJa: readStringId(printing.external_ids, 'name_ja'),
        setName: printing.set_name,
        setCode: printing.set_code,
        rarity: printing.rarity,
        kreamProductUrl: readKreamProductUrl(printing.external_ids),
      });
    }

    if (rows.length < CARD_PAGE_SIZE) break;
  }

  return queries;
}

/**
 * Builds a CSV sample id → `card_printings.id` map for CSV resolution.
 *
 * CSV rows use a stable id derived from the official Korean card number as
 * `PKMKR-<card_num>`. Legacy `external_ids.sample_id` aliases (`KR-*`) are still
 * accepted so older seeded rows can resolve while the CSV remains canonical.
 */
export async function getSampleIdToPrintingId(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // Supabase caps a single select at 1000 rows, so the full printing set is
  // paged — otherwise printings past the first page (e.g. catalog cards with
  // late ids) are missing from the map and their CSV rows fail to resolve.
  for (let from = 0; ; from += CARD_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('card_printings')
      .select('id, set_code, external_ids')
      .order('id', { ascending: true })
      .range(from, from + CARD_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load card printings: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      set_code: string | null;
      external_ids: Record<string, unknown> | null;
    }>;

    for (const row of rows) {
      const sampleId = row.external_ids?.sample_id;
      if (typeof sampleId === 'string' && sampleId.length > 0) {
        map.set(sampleId, row.id);
      }

      const koreanCardNum = row.external_ids?.card_num;
      if (typeof koreanCardNum === 'string' && koreanCardNum.length > 0) {
        map.set(`PKMKR-${koreanCardNum}`, row.id);
      }

      if (typeof row.set_code === 'string' && /^BS\d+$/.test(row.set_code)) {
        map.set(`PKMKR-${row.set_code}`, row.id);
      }
    }

    if (rows.length < CARD_PAGE_SIZE) break;
  }

  return map;
}

/** Runs every enabled price source across all catalog cards. */
export async function collectDailyPrices(
  supabase: SupabaseClient,
  options: CollectPricesOptions = {},
): Promise<CollectPricesResult> {
  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const allCards = await getCardQueries(supabase);
  const cards = selectCardWindow(allCards, {
    cardOffset: options.cardOffset,
    cardLimit: options.cardLimit,
    dailyWindowSize: options.dailyWindowSize,
    dailyWindowDate: options.dailyWindowDate ?? snapshotDate,
  });

  const sources = buildSourceRunners(snapshotDate, options.fetchImpl);
  // Browser-only/gated sources (KREAM, eBay scrape) are blocked from datacenter
  // IPs and require compliant access, so they run only when a browser fetch is
  // injected — i.e. the local script path, never the Vercel Cron route.
  const reachable = options.fetchImpl
    ? sources
    : sources.filter((source) => !source.requiresBrowser);
  const selected = options.only
    ? reachable.filter((source) => options.only!.includes(source.sourceName))
    : reachable;

  const sourceResults: SourceRunResult[] = [];

  for (const source of selected) {
    if (!source.enabled()) {
      sourceResults.push(skippedResult(source.sourceName));
      continue;
    }
    sourceResults.push(
      await runSource(supabase, source, cards, snapshotDate, options.dryRun ?? false, {
        displayCurrency: options.displayCurrency,
        exchangeRates: options.exchangeRates,
        sourceBatchSize: options.sourceBatchSize,
        cardOffset: options.cardOffset ?? 0,
        onProgress: options.onProgress,
      }),
    );
  }

  const failures = sourceResults.flatMap((result) => result.failures);
  const snapshotsUpserted = sourceResults.reduce(
    (sum, result) => sum + result.snapshotsUpserted,
    0,
  );

  return {
    cardsProcessed: cards.length,
    snapshotsUpserted,
    failures,
    status: resolveOverallStatus(sourceResults),
    sources: sourceResults,
  };
}

export function selectCardWindow<T>(
  cards: readonly T[],
  options: Pick<
    CollectPricesOptions,
    'cardOffset' | 'cardLimit' | 'dailyWindowSize' | 'dailyWindowDate'
  >,
): T[] {
  const dailyOffset = options.dailyWindowSize
    ? resolveDailyWindowOffset(cards.length, options.dailyWindowSize, options.dailyWindowDate)
    : 0;
  const offset = dailyOffset + (options.cardOffset ?? 0);
  const limit = options.cardLimit ?? options.dailyWindowSize;
  return limit ? cards.slice(offset, offset + limit) : cards.slice(offset);
}

export function resolveDailyWindowOffset(
  cardCount: number,
  windowSize: number,
  dateString?: string,
): number {
  if (cardCount <= 0) return 0;

  const date = dateString ? new Date(`${dateString}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid daily window date: ${dateString}`);
  }

  const windowCount = Math.ceil(cardCount / windowSize);
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return (dayNumber % windowCount) * windowSize;
}

export function splitIntoSourceBatches<T>(cards: readonly T[], batchSize?: number): T[][] {
  if (cards.length === 0) return [];
  if (!batchSize || batchSize >= cards.length) return [cards.slice()];

  const batches: T[][] = [];
  for (let start = 0; start < cards.length; start += batchSize) {
    batches.push(cards.slice(start, start + batchSize));
  }
  return batches;
}

/** Upserts snapshots into `card_price_snapshots`, returning the count written. */
export async function upsertSnapshots(
  supabase: SupabaseClient,
  snapshots: readonly SnapshotAggregate[],
): Promise<number> {
  const rows = snapshots.map(toSnapshotRow);
  const { error } = await supabase.from('card_price_snapshots').upsert(rows, {
    onConflict:
      'card_printing_id,snapshot_date,market,currency,variant,condition_label,grade_company,grade_value,source_name',
  });

  if (error) {
    if (isMissingSnapshotDisplayColumn(error.message)) {
      const legacyRows = snapshots.map(toLegacySnapshotRow);
      const retry = await supabase.from('card_price_snapshots').upsert(legacyRows, {
        onConflict:
          'card_printing_id,snapshot_date,market,currency,variant,condition_label,grade_company,grade_value,source_name',
      });
      if (!retry.error) return legacyRows.length;
    }
    throw new Error(`Failed to upsert snapshots: ${error.message}`);
  }

  return rows.length;
}

/** Upserts fetched FX rows into `exchange_rates`, returning the count written. */
export async function upsertExchangeRates(
  supabase: SupabaseClient,
  rates: readonly ExchangeRateInput[],
): Promise<number> {
  if (rates.length === 0) return 0;

  const rows = uniqueExchangeRates(rates).map((rate) => ({
    base_currency: rate.baseCurrency,
    quote_currency: rate.quoteCurrency,
    rate: rate.rate,
    rate_date: rate.rateDate,
    provider: rate.provider,
    fetched_at: rate.fetchedAt,
    raw_payload: rate.rawPayload,
  }));

  const { error } = await supabase.from('exchange_rates').upsert(rows, {
    onConflict: 'base_currency,quote_currency,rate_date,provider',
  });

  if (error) {
    throw new Error(`Failed to upsert exchange rates: ${error.message}`);
  }

  return rows.length;
}

function uniqueExchangeRates(rates: readonly ExchangeRateInput[]): ExchangeRateInput[] {
  const byKey = new Map<string, ExchangeRateInput>();
  for (const rate of rates) {
    byKey.set(`${rate.baseCurrency}|${rate.quoteCurrency}|${rate.rateDate}|${rate.provider}`, rate);
  }
  return Array.from(byKey.values());
}

/**
 * Inserts source observations while preserving source amount/currency. Existing
 * source item ids / URLs are skipped so manual CSV imports stay idempotent.
 */
export async function insertPriceObservations(
  supabase: SupabaseClient,
  observations: readonly PriceObservationInput[],
): Promise<number> {
  const rows = await filterNewObservationRows(supabase, observations);
  if (rows.length === 0) return 0;

  const { error } = await supabase.from('price_observations').insert(rows);
  if (error) {
    if (isLegacySourceItemUniqueViolation(error.message)) {
      const legacyRows = await filterLegacyUniqueObservationRows(supabase, rows);
      if (legacyRows.length === 0) return 0;
      const retry = await supabase.from('price_observations').insert(legacyRows);
      if (!retry.error) return legacyRows.length;
    }
    throw new Error(`Failed to insert price observations: ${error.message}`);
  }

  return rows.length;
}

// --- source runners ---------------------------------------------------------

type AskingCollector = (card: CardQuery) => Promise<SnapshotAggregate[]>;
type SoldCollector = (card: CardQuery) => Promise<PriceObservationInput[]>;

interface SourceRunner {
  sourceName: string;
  market: PriceMarket;
  enabled: () => boolean;
  /** Asking sources emit snapshots directly; sold sources emit observations. */
  kind: 'asking' | 'sold';
  collect: AskingCollector | SoldCollector;
  /** Delay between per-card calls, ms. Throttles rate-limited sources. */
  delayMs?: number;
  /** Abort the source after this many consecutive card-level failures. */
  maxConsecutiveFailures?: number;
  /**
   * True for sources that need a real browser session + residential/Korean IP
   * (KREAM, eBay scrape). These run only via `scripts/collect-prices.ts` with an
   * injected browser fetch — never on the datacenter-IP Vercel Cron, where they
   * are blocked. {@link collectDailyPrices} skips them unless a fetch is injected.
   */
  requiresBrowser?: boolean;
}

function buildSourceRunners(snapshotDate: string, fetchImpl?: typeof fetch): SourceRunner[] {
  return [
    {
      sourceName: BROWSE_SOURCE_NAME,
      market: 'NA',
      kind: 'asking',
      enabled: isEbayConfigured,
      maxConsecutiveFailures: 10,
      collect: async (card) => {
        const snapshot = await collectBrowseSnapshot(
          {
            cardPrintingId: card.cardPrintingId,
            cardName: card.cardName,
            nameEn: card.nameEn,
            nameJa: card.nameJa,
            collectorNumber: card.collectorNumber,
          },
          { snapshotDate },
        );
        return snapshot ? [snapshot] : [];
      },
    },
    {
      sourceName: BUNJANG_SOURCE_NAME,
      market: BUNJANG_MARKET,
      kind: 'asking',
      enabled: isBunjangCollectionEnabled,
      collect: (card) =>
        collectBunjangSnapshots(
          buildKoreanKeyword(card),
          { cardPrintingId: card.cardPrintingId, snapshotDate },
          { snapshotDate },
        ),
    },
    {
      sourceName: JOONGNA_SOURCE_NAME,
      market: JOONGNA_MARKET,
      kind: 'asking',
      // Public search HTML is accessible without a browser, but this source is
      // still explicit opt-in because marketplace reuse rights must be reviewed.
      delayMs: 1000,
      enabled: isJoongnaCollectionEnabled,
      collect: (card) =>
        collectJoongnaSnapshots(
          buildJoongnaKeyword(card),
          {
            cardPrintingId: card.cardPrintingId,
            snapshotDate,
            target: buildMatchTarget(card, 'ko'),
          },
          { snapshotDate },
        ),
    },
    {
      sourceName: GUARDIAN_SOURCE_NAME,
      market: GUARDIAN_MARKET,
      kind: 'asking',
      enabled: isGuardianCollectionEnabled,
      collect: (card) =>
        collectGuardianSnapshots(
          {
            cardPrintingId: card.cardPrintingId,
            cardName: card.cardName,
            collectorNumber: card.collectorNumber,
          },
          { snapshotDate },
        ),
    },
    {
      sourceName: KREAM_SOURCE_NAME,
      market: KREAM_MARKET,
      kind: 'asking',
      requiresBrowser: true,
      // KREAM search + asking-option fetch per card; pace to stay under rate limits.
      delayMs: 200,
      maxConsecutiveFailures: 5,
      enabled: isKreamCollectionEnabled,
      collect: async (card) => {
        // Prefer an explicitly mapped product; otherwise resolve by name search.
        let productUrl = card.kreamProductUrl;
        if (!productUrl) {
          const resolved = await resolveKreamProductByName(
            buildKoreanKeyword(card),
            buildMatchTarget(card, 'ko'),
            { fetchImpl },
          );
          if (!resolved) return [];
          productUrl = resolved.productUrl;
        }
        return collectKreamAskingSnapshots(
          productUrl,
          { cardPrintingId: card.cardPrintingId, snapshotDate, productUrl },
          { fetchImpl },
        );
      },
    },
    {
      sourceName: EBAY_SCRAPE_SOURCE_NAME,
      market: 'NA',
      kind: 'sold',
      requiresBrowser: true,
      enabled: isEbayScrapeEnabled,
      collect: (card) =>
        collectEbayScrape(
          buildEbayKeyword(card),
          { cardPrintingId: card.cardPrintingId, target: buildMatchTarget(card, 'intl') },
          { fetchImpl },
        ),
    },
  ];
}

/** Runs one source across all cards, upserts its snapshots, and records the run. */
async function runSource(
  supabase: SupabaseClient,
  source: SourceRunner,
  cards: readonly CardQuery[],
  snapshotDate: string,
  dryRun: boolean,
  options: Pick<
    CollectPricesOptions,
    'displayCurrency' | 'exchangeRates' | 'sourceBatchSize' | 'cardOffset' | 'onProgress'
  > = {},
): Promise<SourceRunResult> {
  const batches = splitIntoSourceBatches(cards, options.sourceBatchSize);
  const aggregate: SourceRunResult = {
    sourceName: source.sourceName,
    snapshotsUpserted: 0,
    observationsCollected: 0,
    failures: [],
    status: 'succeeded',
  };
  const batchStatuses: SourceRunResult['status'][] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const relativeStart = batchIndex * (options.sourceBatchSize ?? cards.length);
    const cardStart = (options.cardOffset ?? 0) + relativeStart;
    const cardEnd = cardStart + batch.length - 1;

    options.onProgress?.({
      sourceName: source.sourceName,
      batchIndex: batchIndex + 1,
      batchCount: batches.length,
      cardOffset: options.cardOffset ?? 0,
      cardStart,
      cardEnd,
      cardCount: batch.length,
    });

    const result = await runSourceBatch(
      supabase,
      source,
      batch,
      snapshotDate,
      dryRun,
      {
        displayCurrency: options.displayCurrency,
        exchangeRates: options.exchangeRates,
      },
      {
        batchIndex: batchIndex + 1,
        batchCount: batches.length,
        cardOffset: options.cardOffset ?? 0,
        cardStart,
        cardEnd,
        cardCount: batch.length,
        sourceBatchSize: options.sourceBatchSize ?? null,
      },
    );

    aggregate.snapshotsUpserted += result.snapshotsUpserted;
    aggregate.observationsCollected += result.observationsCollected;
    aggregate.failures.push(...result.failures);
    batchStatuses.push(result.status);

    options.onProgress?.({
      sourceName: source.sourceName,
      batchIndex: batchIndex + 1,
      batchCount: batches.length,
      cardOffset: options.cardOffset ?? 0,
      cardStart,
      cardEnd,
      cardCount: batch.length,
      status: result.status,
    });

    if (result.aborted) break;
  }

  aggregate.status = resolveBatchStatuses(batchStatuses);
  return aggregate;
}

/** Runs one source over one card batch, upserts its data, and records the batch. */
async function runSourceBatch(
  supabase: SupabaseClient,
  source: SourceRunner,
  cards: readonly CardQuery[],
  snapshotDate: string,
  dryRun: boolean,
  options: Pick<CollectPricesOptions, 'displayCurrency' | 'exchangeRates'>,
  batch: {
    batchIndex: number;
    batchCount: number;
    cardOffset: number;
    cardStart: number;
    cardEnd: number;
    cardCount: number;
    sourceBatchSize: number | null;
  },
): Promise<SourceRunResult & { aborted: boolean }> {
  const startedAt = new Date().toISOString();
  const failures: SourceRunResult['failures'] = [];
  const snapshots: SnapshotAggregate[] = [];
  const observations: PriceObservationInput[] = [];
  let aborted = false;
  let consecutiveFailures = 0;

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    try {
      if (source.kind === 'asking') {
        snapshots.push(...(await (source.collect as AskingCollector)(card)));
      } else {
        observations.push(...(await (source.collect as SoldCollector)(card)));
      }
      consecutiveFailures = 0;
    } catch (error) {
      const message = errorMessage(error);
      failures.push({ cardPrintingId: card.cardPrintingId, error: message });
      consecutiveFailures += 1;
      if (source.requiresBrowser && isBrowserContextClosedError(message)) {
        aborted = true;
        break;
      }
      if (source.maxConsecutiveFailures && consecutiveFailures >= source.maxConsecutiveFailures) {
        aborted = true;
        break;
      }
    }
    if (source.delayMs && i < cards.length - 1) {
      await sleep(source.delayMs);
    }
  }

  let observationsInserted = 0;
  if (source.kind === 'sold') {
    if (!dryRun && observations.length > 0) {
      observationsInserted = await insertPriceObservations(supabase, observations);
    }
    snapshots.push(...aggregateObservations(observations, { sourceName: source.sourceName }));
  }

  const displaySnapshots = await attachDisplayPrices(supabase, snapshots, options);

  let snapshotsUpserted = 0;
  if (!dryRun && displaySnapshots.length > 0) {
    snapshotsUpserted = await upsertSnapshots(supabase, displaySnapshots);
  }

  const status = resolveStatus(cards.length, failures.length);
  if (!dryRun) {
    await recordRun(supabase, {
      sourceName: source.sourceName,
      market: source.market,
      status,
      startedAt,
      snapshotsUpserted,
      observationsInserted,
      failures,
      metadata: { batch, aborted },
    });
  }

  return {
    sourceName: source.sourceName,
    snapshotsUpserted: dryRun ? displaySnapshots.length : snapshotsUpserted,
    observationsCollected: observations.length,
    failures,
    status,
    aborted,
  };
}

// --- helpers ----------------------------------------------------------------

function buildKoreanKeyword(card: CardQuery): string {
  return [card.cardName, card.collectorNumber].filter(Boolean).join(' ');
}

/**
 * Joongna search is brittle with collector numbers such as `201/165`; those
 * often return zero results. Search by Korean card name, then let the adapter's
 * match scorer decide whether set/number context is strong enough.
 */
function buildJoongnaKeyword(card: CardQuery): string {
  return card.cardName;
}

/** eBay keyword biased toward the English (or Japanese) printing + number. */
function buildEbayKeyword(card: CardQuery): string {
  const name = card.nameEn ?? card.nameJa ?? card.cardName;
  return [name, card.collectorNumber].filter(Boolean).join(' ');
}

/**
 * Builds the relevance target for a card. `ko` uses only the Korean name (KREAM);
 * `intl` includes English/Japanese names for eBay, where titles are non-Korean.
 * Null names are filtered out by the matcher.
 */
function buildMatchTarget(card: CardQuery, locale: 'ko' | 'intl'): MatchTarget {
  const names = locale === 'ko' ? [card.cardName] : [card.nameEn, card.nameJa, card.cardName];
  return {
    names,
    collectorNumber: card.collectorNumber,
    setTokens: [card.setCode, card.setName, card.rarity],
  };
}

/** Reads a string field from a printing's `external_ids`, or null. */
function readStringId(externalIds: Record<string, unknown> | null, key: string): string | null {
  const value = externalIds?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isEbayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

function isEbayScrapeEnabled(): boolean {
  return process.env.EBAY_SCRAPE_ENABLED === 'true';
}

function readKreamProductUrl(externalIds: Record<string, unknown> | null): string | null {
  const url = externalIds?.kream_product_url;
  if (typeof url === 'string' && url.length > 0) return url;
  const id = externalIds?.kream_product_id;
  if (typeof id === 'string' && id.length > 0) return `https://kream.co.kr/products/${id}`;
  if (typeof id === 'number') return `https://kream.co.kr/products/${id}`;
  return null;
}

export async function attachDisplayPrices(
  supabase: SupabaseClient,
  snapshots: readonly SnapshotAggregate[],
  options: Pick<CollectPricesOptions, 'displayCurrency' | 'exchangeRates'>,
): Promise<SnapshotAggregate[]> {
  if (snapshots.length === 0) return [];

  const displayCurrency = options.displayCurrency ?? DEFAULT_DISPLAY_CURRENCY;
  const rates =
    options.exchangeRates ??
    (await loadExchangeRatesForSnapshots(supabase, snapshots, displayCurrency));

  return applyDisplayCurrencyToSnapshots(snapshots, rates, displayCurrency);
}

async function loadExchangeRatesForSnapshots(
  supabase: SupabaseClient,
  snapshots: readonly SnapshotAggregate[],
  displayCurrency: string,
): Promise<ExchangeRateInput[]> {
  const foreignCurrencies = Array.from(
    new Set(
      snapshots
        .map((snapshot) => snapshot.currency.toUpperCase())
        .filter((currency) => currency !== displayCurrency.toUpperCase()),
    ),
  );
  if (foreignCurrencies.length === 0) return [];

  const dates = snapshots.map((snapshot) => snapshot.snapshotDate).sort();
  const fromDate = shiftDate(dates[0], -10);
  const toDate = dates[dates.length - 1];

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('base_currency, quote_currency, rate, rate_date, provider, fetched_at, raw_payload')
    .in('base_currency', foreignCurrencies)
    .eq('quote_currency', displayCurrency.toUpperCase())
    .gte('rate_date', fromDate)
    .lte('rate_date', toDate);

  if (error) {
    if (isMissingExchangeRatesTable(error.message)) return [];
    throw new Error(`Failed to load exchange rates: ${error.message}`);
  }

  return ((data ?? []) as ExchangeRateRow[]).map((row) => ({
    baseCurrency: row.base_currency,
    quoteCurrency: row.quote_currency,
    rate: Number(row.rate),
    rateDate: row.rate_date,
    provider: row.provider,
    fetchedAt: row.fetched_at,
    rawPayload: row.raw_payload ?? {},
  }));
}

interface ExchangeRateRow {
  base_currency: string;
  quote_currency: string;
  rate: number | string;
  rate_date: string;
  provider: string;
  fetched_at: string;
  raw_payload: Record<string, unknown> | null;
}

async function filterNewObservationRows(
  supabase: SupabaseClient,
  observations: readonly PriceObservationInput[],
) {
  const rows = observations.map(toObservationRow);
  const seen = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const keys = observationIdentities(row);
    if (keys.length === 0) return true;
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });

  const existing = await loadExistingObservationIdentities(supabase, uniqueRows);
  return uniqueRows.filter((row) => {
    const keys = observationIdentities(row);
    return keys.length === 0 || keys.every((key) => !existing.has(key));
  });
}

async function loadExistingObservationIdentities(
  supabase: SupabaseClient,
  rows: readonly ReturnType<typeof toObservationRow>[],
): Promise<Set<string>> {
  const sourceNames = Array.from(new Set(rows.map((row) => row.source_name)));
  const itemIds = Array.from(
    new Set(
      rows.map((row) => row.source_item_id).filter((value): value is string => Boolean(value)),
    ),
  );
  const urls = Array.from(
    new Set(rows.map((row) => row.source_url).filter((value): value is string => Boolean(value))),
  );

  const existing = new Set<string>();

  if (itemIds.length > 0) {
    const { data, error } = await supabase
      .from('price_observations')
      .select(
        'source_name, source_item_id, source_url, sold_at, sold_price, variant, grade_company, grade_value',
      )
      .in('source_name', sourceNames)
      .in('source_item_id', itemIds);
    if (error) throw new Error(`Failed to check existing observations: ${error.message}`);
    for (const row of (data ?? []) as ObservationIdentityRow[]) {
      observationIdentities(row).forEach((key) => existing.add(key));
    }
  }

  if (urls.length > 0) {
    const { data, error } = await supabase
      .from('price_observations')
      .select(
        'source_name, source_item_id, source_url, sold_at, sold_price, variant, grade_company, grade_value',
      )
      .in('source_name', sourceNames)
      .in('source_url', urls);
    if (error) throw new Error(`Failed to check existing observations: ${error.message}`);
    for (const row of (data ?? []) as ObservationIdentityRow[]) {
      observationIdentities(row).forEach((key) => existing.add(key));
    }
  }

  return existing;
}

async function filterLegacyUniqueObservationRows(
  supabase: SupabaseClient,
  rows: readonly ReturnType<typeof toObservationRow>[],
) {
  const seen = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const key = legacyObservationIdentity(row);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const existing = await loadExistingLegacyObservationIdentities(supabase, uniqueRows);
  return uniqueRows.filter((row) => {
    const key = legacyObservationIdentity(row);
    return !key || !existing.has(key);
  });
}

async function loadExistingLegacyObservationIdentities(
  supabase: SupabaseClient,
  rows: readonly ReturnType<typeof toObservationRow>[],
): Promise<Set<string>> {
  const sourceNames = Array.from(new Set(rows.map((row) => row.source_name)));
  const itemIds = Array.from(
    new Set(
      rows.map((row) => row.source_item_id).filter((value): value is string => Boolean(value)),
    ),
  );
  const urls = Array.from(
    new Set(rows.map((row) => row.source_url).filter((value): value is string => Boolean(value))),
  );
  const existing = new Set<string>();

  if (itemIds.length > 0) {
    const { data, error } = await supabase
      .from('price_observations')
      .select('source_name, source_item_id, source_url')
      .in('source_name', sourceNames)
      .in('source_item_id', itemIds);
    if (error) throw new Error(`Failed to check existing observations: ${error.message}`);
    for (const row of (data ?? []) as ObservationIdentityRow[]) {
      const key = legacyObservationIdentity(row);
      if (key) existing.add(key);
    }
  }

  if (urls.length > 0) {
    const { data, error } = await supabase
      .from('price_observations')
      .select('source_name, source_item_id, source_url')
      .in('source_name', sourceNames)
      .in('source_url', urls);
    if (error) throw new Error(`Failed to check existing observations: ${error.message}`);
    for (const row of (data ?? []) as ObservationIdentityRow[]) {
      const key = legacyObservationIdentity(row);
      if (key) existing.add(key);
    }
  }

  return existing;
}

interface ObservationIdentityRow {
  source_name: string;
  source_item_id: string | null;
  source_url: string | null;
  sold_at?: string | null;
  sold_price?: number | string | null;
  variant?: string | null;
  grade_company?: string | null;
  grade_value?: string | null;
}

function observationIdentities(row: ObservationIdentityRow): string[] {
  const sourceKeys = [
    row.source_item_id ? `item:${row.source_item_id}` : null,
    row.source_url ? `url:${row.source_url}` : null,
  ].filter((value): value is string => Boolean(value));

  return sourceKeys.map((sourceKey) =>
    [
      row.source_name,
      sourceKey,
      normalizeIdentityTimestamp(row.sold_at),
      normalizeIdentityNumber(row.sold_price),
      row.variant ?? '',
      row.grade_company ?? '',
      row.grade_value ?? '',
    ].join('|'),
  );
}

function legacyObservationIdentity(row: ObservationIdentityRow): string | null {
  if (row.source_item_id) return `${row.source_name}|item:${row.source_item_id}`;
  if (row.source_url) return `${row.source_name}|url:${row.source_url}`;
  return null;
}

function normalizeIdentityTimestamp(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function normalizeIdentityNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toString() : String(value);
}

function toObservationRow(observation: PriceObservationInput) {
  return {
    card_printing_id: observation.cardPrintingId,
    source_name: observation.sourceName,
    market: observation.market,
    currency: observation.currency,
    sold_price: observation.soldPrice,
    sold_at: observation.soldAt,
    observed_at: observation.observedAt,
    condition_label: observation.conditionLabel,
    grade_company: observation.gradeCompany,
    grade_value: observation.gradeValue,
    variant: observation.variant,
    listing_title: observation.listingTitle,
    source_url: observation.sourceUrl,
    source_item_id: observation.sourceItemId,
    confidence_score: observation.confidenceScore,
    raw_payload: observation.rawPayload,
  };
}

function toSnapshotRow(snapshot: SnapshotAggregate) {
  return {
    ...toLegacySnapshotRow(snapshot),
    ...(snapshot.displayCurrency
      ? {
          source_currency: snapshot.sourceCurrency ?? snapshot.currency,
          source_avg_price: snapshot.sourceAvgPrice ?? snapshot.avgPrice,
          source_min_price: snapshot.sourceMinPrice ?? snapshot.minPrice,
          source_max_price: snapshot.sourceMaxPrice ?? snapshot.maxPrice,
          display_currency: snapshot.displayCurrency,
          display_avg_price: snapshot.displayAvgPrice,
          display_min_price: snapshot.displayMinPrice,
          display_max_price: snapshot.displayMaxPrice,
          fx_rate: snapshot.fxRate,
          fx_rate_date: snapshot.fxRateDate,
          fx_provider: snapshot.fxProvider,
        }
      : {}),
  };
}

function toLegacySnapshotRow(snapshot: SnapshotAggregate) {
  return {
    card_printing_id: snapshot.cardPrintingId,
    snapshot_date: snapshot.snapshotDate,
    currency: snapshot.currency,
    market: snapshot.market,
    variant: snapshot.variant,
    condition_label: snapshot.conditionLabel,
    grade_company: snapshot.gradeCompany,
    grade_value: snapshot.gradeValue,
    avg_price: snapshot.avgPrice,
    min_price: snapshot.minPrice,
    max_price: snapshot.maxPrice,
    sample_count: snapshot.sampleCount,
    source_name: snapshot.sourceName,
    source_url: snapshot.sourceUrl,
    aggregation_method: snapshot.aggregationMethod,
  };
}

async function recordRun(
  supabase: SupabaseClient,
  run: {
    sourceName: string;
    market: PriceMarket;
    status: SourceRunResult['status'];
    startedAt: string;
    snapshotsUpserted: number;
    observationsInserted: number;
    failures: SourceRunResult['failures'];
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from('price_collection_runs').insert({
    source_name: run.sourceName,
    market: run.market,
    status: run.status,
    started_at: run.startedAt,
    finished_at: new Date().toISOString(),
    observations_inserted: run.observationsInserted,
    snapshots_created: run.snapshotsUpserted,
    error_message: run.failures.length > 0 ? `${run.failures.length} card(s) failed` : null,
    metadata: { ...run.metadata, failures: run.failures.slice(0, 10) },
  });
}

function pickPrimaryPrinting(printings: readonly CardPrintingPick[]): CardPrintingPick | null {
  return (
    printings.find((printing) => printing.language === 'ko' && printing.region === 'KR') ??
    printings[0] ??
    null
  );
}

function skippedResult(sourceName: string): SourceRunResult {
  return {
    sourceName,
    snapshotsUpserted: 0,
    observationsCollected: 0,
    failures: [],
    status: 'skipped',
  };
}

function resolveStatus(total: number, failureCount: number): SourceRunResult['status'] {
  if (failureCount === 0) return 'succeeded';
  if (failureCount >= total) return 'failed';
  return 'partial';
}

function resolveOverallStatus(results: readonly SourceRunResult[]): CollectPricesResult['status'] {
  const ran = results.filter((result) => result.status !== 'skipped');
  if (ran.length === 0) return 'succeeded';
  if (ran.every((result) => result.status === 'failed')) return 'failed';
  if (ran.some((result) => result.status === 'failed' || result.status === 'partial'))
    return 'partial';
  return 'succeeded';
}

function resolveBatchStatuses(
  statuses: readonly SourceRunResult['status'][],
): SourceRunResult['status'] {
  const ran = statuses.filter((status) => status !== 'skipped');
  if (ran.length === 0) return 'succeeded';
  if (ran.every((status) => status === 'failed')) return 'failed';
  if (ran.some((status) => status === 'failed' || status === 'partial')) return 'partial';
  return 'succeeded';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingExchangeRatesTable(message: string): boolean {
  return (
    message.includes('exchange_rates') &&
    (message.includes('does not exist') || message.includes('schema cache'))
  );
}

function isMissingSnapshotDisplayColumn(message: string): boolean {
  const mentionsDisplayColumn =
    message.includes('display_') || message.includes('source_') || message.includes('fx_');
  return mentionsDisplayColumn && message.includes('schema cache');
}

function isLegacySourceItemUniqueViolation(message: string): boolean {
  return message.includes('price_observations_source_item_unique_idx');
}

function isBrowserContextClosedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('target page, context or browser has been closed') ||
    lower.includes('browser has been closed') ||
    lower.includes('context has been closed')
  );
}

function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
