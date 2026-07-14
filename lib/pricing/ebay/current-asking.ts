/**
 * On-demand eBay Browse refresh for a single card detail page.
 *
 * The scheduled collector keeps long-running daily coverage, but a user landing
 * on a detail page should see today's Browse API asking snapshot when eBay
 * credentials are configured. This helper updates at most once per card/day.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogCardDetail } from '@/lib/tcg-catalog';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SnapshotAggregate } from '../price-source.types';
import { attachDisplayPrices, upsertSnapshots } from '../collect-prices';
import {
  AUCTION_SOURCE_NAME,
  BROWSE_SOURCE_NAME,
  collectBrowseSnapshot,
  type BrowseBuyingOption,
} from './browse-adapter';

/** Asking sources refreshed on a card-detail visit: fixed-price asks + auction bids. */
const REFRESH_SOURCES: ReadonlyArray<{ buyingOption: BrowseBuyingOption; sourceName: string }> = [
  { buyingOption: 'FIXED_PRICE', sourceName: BROWSE_SOURCE_NAME },
  { buyingOption: 'AUCTION', sourceName: AUCTION_SOURCE_NAME },
];

export type EbayBrowseRefreshStatus = 'updated' | 'fresh' | 'empty' | 'skipped';

export interface EbayBrowseRefreshResult {
  status: EbayBrowseRefreshStatus;
  snapshotsUpserted: number;
  shouldReloadDetail: boolean;
  reason?: string;
}

export interface RefreshEbayBrowseOptions {
  supabase?: SupabaseClient;
  snapshotDate?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_REFRESH_TIMEOUT_MS = 3500;

export async function refreshEbayBrowseSnapshotForCardDetail(
  card: CatalogCardDetail,
  options: RefreshEbayBrowseOptions = {},
): Promise<EbayBrowseRefreshResult> {
  if (!isEbayBrowseRefreshConfigured()) {
    return skipped('missing eBay or Supabase server credentials');
  }

  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const supabase = options.supabase ?? createAdminClient();
  const fetchImpl =
    options.fetchImpl ?? timeoutFetch(options.timeoutMs ?? DEFAULT_REFRESH_TIMEOUT_MS);

  const query = {
    cardPrintingId: card.printing.id,
    cardName: card.cardName,
    nameEn: card.printing.nameEn,
    nameJa: card.printing.nameJa,
    collectorNumber: card.printing.collectorNumber,
    setCode: card.printing.setCode,
  };

  try {
    // Check freshness + collect each source in parallel — the two eBay calls
    // are independent, so there's no reason to run them one after another.
    const results = await Promise.all(
      REFRESH_SOURCES.map(async ({ buyingOption, sourceName }) => {
        if (await hasSnapshotForDate(supabase, card.printing.id, snapshotDate, sourceName)) {
          return { fresh: true, snapshot: null };
        }
        const snapshot = await collectBrowseSnapshot(query, {
          snapshotDate,
          fetchImpl,
          buyingOption,
        });
        return { fresh: false, snapshot };
      }),
    );

    const allFresh = results.every((result) => result.fresh);
    const collected: SnapshotAggregate[] = results.flatMap((result) =>
      result.snapshot ? [result.snapshot] : [],
    );

    if (allFresh) {
      // Today's snapshots already existed, so the cached detail read the caller
      // already has reflects them — no need to force a second full re-read.
      return { status: 'fresh', snapshotsUpserted: 0, shouldReloadDetail: false };
    }

    if (collected.length === 0) {
      return {
        status: 'empty',
        snapshotsUpserted: 0,
        shouldReloadDetail: false,
        reason: 'eBay Browse returned no priced listings',
      };
    }

    const displaySnapshots = await attachDisplayPrices(supabase, collected, {});
    const snapshotsUpserted = await upsertSnapshots(supabase, displaySnapshots);

    return {
      status: 'updated',
      snapshotsUpserted,
      shouldReloadDetail: snapshotsUpserted > 0,
    };
  } catch (error) {
    if (isSupabasePermissionError(error)) {
      return skipped('Supabase service role cannot write price snapshots');
    }
    throw error;
  }
}

async function hasSnapshotForDate(
  supabase: SupabaseClient,
  cardPrintingId: string,
  snapshotDate: string,
  sourceName: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('card_price_snapshots')
    .select('id')
    .eq('card_printing_id', cardPrintingId)
    .eq('snapshot_date', snapshotDate)
    .eq('source_name', sourceName)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check eBay snapshot freshness: ${error.message}`);
  }

  return (data ?? []).length > 0;
}

function isEbayBrowseRefreshConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.EBAY_CLIENT_ID &&
      process.env.EBAY_CLIENT_SECRET,
  );
}

function skipped(reason: string): EbayBrowseRefreshResult {
  return {
    status: 'skipped',
    snapshotsUpserted: 0,
    shouldReloadDetail: false,
    reason,
  };
}

function isSupabasePermissionError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('permission denied');
}

function timeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}
