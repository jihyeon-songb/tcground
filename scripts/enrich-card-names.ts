/**
 * Backfills English card names onto `card_printings.external_ids.name_en`.
 *
 * The catalog comes from pokemoncard.co.kr and carries only Korean names, but
 * eBay is an English marketplace. The sets mirror Japanese ones, so TCGdex has
 * no English names for them — instead we translate the Korean species name with
 * `koreanCardNameToEnglish` (PokéAPI-derived map, see build-pokemon-name-map.ts).
 * Cards with no resolvable species (Trainers/Items/Energy) get `name_en: null`,
 * so collection falls back to a number-based keyword.
 *
 * Usage (Node 20+ loads env from .env.local):
 *   node --env-file=.env.local --import tsx scripts/enrich-card-names.ts            # all printings
 *   node --env-file=.env.local --import tsx scripts/enrich-card-names.ts --dry-run  # no DB writes
 *   node --env-file=.env.local --import tsx scripts/enrich-card-names.ts --limit 50
 */

import { createAdminClient } from '../lib/supabase/admin';
import { koreanCardNameToEnglish } from '../lib/pricing/ebay/korean-card-name';

const PAGE_SIZE = 1000;

interface CardRow {
  name: string;
  card_printings: Array<{ id: string; external_ids: Record<string, unknown> | null }>;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitFlag = args.indexOf('--limit');
  const limit = limitFlag !== -1 ? Number.parseInt(args[limitFlag + 1] ?? '', 10) : undefined;

  const supabase = createAdminClient();

  let processed = 0;
  let withEn = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('cards')
      .select('name, card_printings(id, external_ids)')
      .order('slug', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to load cards: ${error.message}`);

    const rows = (data ?? []) as unknown as CardRow[];
    for (const row of rows) {
      const nameEn = koreanCardNameToEnglish(row.name);
      for (const printing of row.card_printings ?? []) {
        if (limit && processed >= limit) break;
        if (nameEn) withEn += 1;

        const externalIds = { ...(printing.external_ids ?? {}), name_en: nameEn };
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
        processed += 1;
      }
      if (limit && processed >= limit) break;
    }

    if (rows.length < PAGE_SIZE || (limit && processed >= limit)) break;
  }

  console.log(`[enrich] processed=${processed} withEn=${withEn} dryRun=${dryRun}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
