/**
 * Backfills English / Japanese card names onto `card_printings.external_ids`.
 *
 * The catalog comes from pokemoncard.co.kr and carries only Korean names, but
 * eBay listings are English/Japanese. To match them we enrich each printing with
 * TCGdex names: for every set we fetch `/ja/sets/{id}` and `/en/sets/{id}` and map
 * each card's `localId` (the collector number's left part) → name. Missing names
 * are written as `null` so collection knows the lookup was attempted (many sets
 * are JP-exclusive and have no English name).
 *
 * Usage (Node 20+ loads env from .env.local):
 *   node --env-file=.env.local --import tsx scripts/enrich-card-names.ts            # all printings
 *   node --env-file=.env.local --import tsx scripts/enrich-card-names.ts --dry-run  # no DB writes
 *   node --env-file=.env.local --import tsx scripts/enrich-card-names.ts --limit 50
 */

import { createAdminClient } from '../lib/supabase/admin';

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';
type Locale = 'en' | 'ja';

interface PrintingRow {
  id: string;
  set_code: string | null;
  collector_number: string | null;
  external_ids: Record<string, unknown> | null;
}

/** localId → name map for one set+locale; empty when the set is absent in that locale. */
async function fetchSetNames(setId: string, locale: Locale): Promise<Map<string, string>> {
  const response = await fetch(`${TCGDEX_BASE_URL}/${locale}/sets/${setId}`);
  if (!response.ok) return new Map();

  const set = (await response.json()) as { cards?: Array<{ localId?: string; name?: string }> };
  const map = new Map<string, string>();
  for (const card of set.cards ?? []) {
    if (card.localId != null && card.name) {
      map.set(String(card.localId), card.name);
    }
  }
  return map;
}

/** Looks up a name by localId, tolerating leading-zero differences ("092" vs "92"). */
function lookupName(names: Map<string, string>, localId: string): string | null {
  return names.get(localId) ?? names.get(localId.replace(/^0+/, '')) ?? null;
}

/** The collector number's left part is the TCGdex localId (e.g. "217/187" → "217"). */
function toLocalId(collectorNumber: string | null): string | null {
  if (!collectorNumber) return null;
  const left = collectorNumber.split('/')[0]?.trim();
  return left && left.length > 0 ? left : null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitFlag = args.indexOf('--limit');
  const limit = limitFlag !== -1 ? Number.parseInt(args[limitFlag + 1] ?? '', 10) : undefined;

  const supabase = createAdminClient();

  let query = supabase
    .from('card_printings')
    .select('id, set_code, collector_number, external_ids')
    .order('set_code', { ascending: true });
  if (limit && Number.isFinite(limit)) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load printings: ${error.message}`);
  const printings = (data ?? []) as PrintingRow[];

  // Cache one names map per (setId, locale) so each set is fetched at most twice.
  const cache = new Map<string, Map<string, string>>();
  async function namesFor(setId: string, locale: Locale): Promise<Map<string, string>> {
    const key = `${locale}:${setId}`;
    let names = cache.get(key);
    if (!names) {
      names = await fetchSetNames(setId, locale);
      cache.set(key, names);
    }
    return names;
  }

  let updated = 0;
  let withEn = 0;
  let withJa = 0;

  for (const printing of printings) {
    const setId = printing.set_code?.toLowerCase();
    const localId = toLocalId(printing.collector_number);
    if (!setId || !localId) continue;

    const nameEn = lookupName(await namesFor(setId, 'en'), localId);
    const nameJa = lookupName(await namesFor(setId, 'ja'), localId);
    if (nameEn) withEn += 1;
    if (nameJa) withJa += 1;

    const externalIds = { ...(printing.external_ids ?? {}), name_en: nameEn, name_ja: nameJa };

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('card_printings')
        .update({ external_ids: externalIds })
        .eq('id', printing.id);
      if (updateError) {
        console.warn(`[enrich] update failed for ${printing.id}: ${updateError.message}`);
        continue;
      }
    }
    updated += 1;
  }

  console.log(
    `[enrich] printings=${printings.length} processed=${updated} withEn=${withEn} withJa=${withJa} dryRun=${dryRun}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
