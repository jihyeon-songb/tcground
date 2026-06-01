/**
 * Daily price collection orchestration.
 *
 * Fetches the catalog cards, asks the eBay Browse adapter for one asking-price
 * snapshot per card, and upserts the results into `card_price_snapshots` via the
 * service-role admin client. A `price_collection_runs` row records the outcome.
 * A single card failure never aborts the whole run.
 *
 * Shared by the Vercel Cron route and the local `scripts/collect-prices.ts`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectBrowseSnapshot, BROWSE_SOURCE_NAME, type BrowseCardQuery } from './ebay/browse-adapter';
import type { PriceMarket, SnapshotAggregate } from './price-source.types';

export interface CollectPricesResult {
  cardsProcessed: number;
  snapshotsUpserted: number;
  failures: Array<{ cardPrintingId: string; error: string }>;
  status: 'succeeded' | 'partial' | 'failed';
}

export interface CollectPricesOptions {
  /** When true, computes snapshots but does not write to the DB (rehearsal). */
  dryRun?: boolean;
  snapshotDate?: string;
  market?: PriceMarket;
  fetchImpl?: typeof fetch;
}

interface CardPrintingPick {
  id: string;
  collector_number: string | null;
  language: string | null;
  region: string | null;
}

interface CardCatalogRow {
  name: string;
  card_printings: CardPrintingPick[];
}

/** Loads catalog cards as Browse queries, preferring the Korean printing. */
export async function getBrowseCardQueries(supabase: SupabaseClient): Promise<BrowseCardQuery[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('name, card_printings(id, collector_number, language, region)')
    .order('slug', { ascending: true });

  if (error) {
    throw new Error(`Failed to load catalog cards: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as CardCatalogRow[];
  const queries: BrowseCardQuery[] = [];

  for (const row of rows) {
    const printing = pickPrimaryPrinting(row.card_printings);
    if (!printing) continue;
    queries.push({
      cardPrintingId: printing.id,
      cardName: row.name,
      collectorNumber: printing.collector_number,
    });
  }

  return queries;
}

/** Builds a `external_ids.sample_id` → `card_printings.id` map for CSV resolution. */
export async function getSampleIdToPrintingId(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('card_printings')
    .select('id, external_ids');

  if (error) {
    throw new Error(`Failed to load card printings: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; external_ids: Record<string, unknown> | null }>) {
    const sampleId = row.external_ids?.sample_id;
    if (typeof sampleId === 'string' && sampleId.length > 0) {
      map.set(sampleId, row.id);
    }
  }

  return map;
}

/** Runs the daily Browse collection across all catalog cards. */
export async function collectDailyPrices(
  supabase: SupabaseClient,
  options: CollectPricesOptions = {},
): Promise<CollectPricesResult> {
  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const startedAt = new Date().toISOString();

  const queries = await getBrowseCardQueries(supabase);
  const snapshots: SnapshotAggregate[] = [];
  const failures: CollectPricesResult['failures'] = [];

  for (const query of queries) {
    try {
      const snapshot = await collectBrowseSnapshot(query, {
        snapshotDate,
        market: options.market,
        fetchImpl: options.fetchImpl,
      });
      if (snapshot) snapshots.push(snapshot);
    } catch (error) {
      failures.push({ cardPrintingId: query.cardPrintingId, error: errorMessage(error) });
    }
  }

  let snapshotsUpserted = 0;
  if (!options.dryRun && snapshots.length > 0) {
    snapshotsUpserted = await upsertSnapshots(supabase, snapshots);
  }

  const status = resolveStatus(queries.length, failures.length);

  if (!options.dryRun) {
    await recordRun(supabase, {
      sourceName: BROWSE_SOURCE_NAME,
      market: options.market ?? 'NA',
      status,
      startedAt,
      snapshotsUpserted,
      failures,
    });
  }

  return {
    cardsProcessed: queries.length,
    snapshotsUpserted: options.dryRun ? snapshots.length : snapshotsUpserted,
    failures,
    status,
  };
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
    throw new Error(`Failed to upsert snapshots: ${error.message}`);
  }

  return rows.length;
}

function toSnapshotRow(snapshot: SnapshotAggregate) {
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
    status: CollectPricesResult['status'];
    startedAt: string;
    snapshotsUpserted: number;
    failures: CollectPricesResult['failures'];
  },
): Promise<void> {
  await supabase.from('price_collection_runs').insert({
    source_name: run.sourceName,
    market: run.market,
    status: run.status,
    started_at: run.startedAt,
    finished_at: new Date().toISOString(),
    observations_inserted: 0,
    snapshots_created: run.snapshotsUpserted,
    error_message: run.failures.length > 0 ? `${run.failures.length} card(s) failed` : null,
    metadata: { failures: run.failures.slice(0, 10) },
  });
}

function pickPrimaryPrinting(printings: readonly CardPrintingPick[]): CardPrintingPick | null {
  return (
    printings.find((printing) => printing.language === 'ko' && printing.region === 'KR') ??
    printings[0] ??
    null
  );
}

function resolveStatus(total: number, failureCount: number): CollectPricesResult['status'] {
  if (failureCount === 0) return 'succeeded';
  if (failureCount >= total) return 'failed';
  return 'partial';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
