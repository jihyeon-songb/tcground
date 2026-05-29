/**
 * Local price collection / import script (verification + manual sold import).
 *
 * Usage (Node 20+ loads env from .env.local):
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --browse
 *   node --env-file=.env.local --import tsx scripts/collect-prices.ts --csv
 *   add --dry-run to compute without writing to the DB.
 *
 * `--browse` runs the same daily Browse collection as the cron route.
 * `--csv` imports verified sold rows from memory-bank/price-source-validation.csv,
 * aggregates them, and upserts sold snapshots (the chart's overlay reference).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import {
  collectDailyPrices,
  getSampleIdToPrintingId,
  upsertSnapshots,
} from '../lib/pricing/collect-prices';
import { parsePriceValidationCsv, resolveCardPrintingIds } from '../lib/pricing/csv-import';
import { aggregateObservations } from '../lib/pricing/aggregate';

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const runCsv = args.has('--csv');
  const runBrowse = args.has('--browse') || !runCsv;

  const supabase = createAdminClient();

  if (runCsv) {
    const csvPath = join(process.cwd(), 'memory-bank', 'price-source-validation.csv');
    const parsed = parsePriceValidationCsv(readFileSync(csvPath, 'utf8'));
    const printingIds = await getSampleIdToPrintingId(supabase);
    const observations = resolveCardPrintingIds(parsed, printingIds);
    const snapshots = aggregateObservations(observations);

    console.log(
      `[csv] parsed=${parsed.length} resolved=${observations.length} snapshots=${snapshots.length} dryRun=${dryRun}`,
    );
    if (!dryRun && snapshots.length > 0) {
      const written = await upsertSnapshots(supabase, snapshots);
      console.log(`[csv] upserted ${written} sold snapshots`);
    }
  }

  if (runBrowse) {
    const result = await collectDailyPrices(supabase, { dryRun });
    console.log('[browse]', JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
