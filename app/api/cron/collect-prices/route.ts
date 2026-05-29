import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { collectDailyPrices } from '@/lib/pricing/collect-prices';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily price collection entry point, triggered by Vercel Cron.
 *
 * Verifies the `CRON_SECRET` bearer token, then runs the Browse asking-price
 * collection across the catalog and upserts daily snapshots.
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
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
