import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { collectDailyPrices } from '@/lib/pricing/collect-prices';
import { PRICES_CACHE_TAG } from '@/lib/tcg-catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily price collection entry point, triggered by Vercel Cron.
 *
 * Verifies the `CRON_SECRET` bearer token, then runs collection across the
 * catalog and upserts daily snapshots. It calls `collectDailyPrices` without a
 * fetch, so browser-only sources (KREAM, eBay scrape) — which are blocked from
 * Vercel's datacenter IP — are automatically skipped; only server-reachable
 * sources (e.g. eBay Browse) run here. Browser sources run via
 * `scripts/collect-prices.ts` on a residential / Korean IP.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const result = await collectDailyPrices(supabase);
    if (result.snapshotsUpserted > 0) {
      revalidateTag(PRICES_CACHE_TAG, 'max');
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
