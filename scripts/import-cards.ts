/**
 * Local card catalog import script (TCGdex → Supabase).
 *
 * Usage (Node 20+ loads env from .env.local):
 *   node --env-file=.env.local --import tsx scripts/import-cards.ts --set=sv2a
 *   node --env-file=.env.local --import tsx scripts/import-cards.ts --set=sv2a --set=sv3
 *   add --locale=ko,ja,en to set the fallback chain (default), --dry-run to skip writes.
 *
 * Fetches each Pokémon set from the public TCGdex REST API and upserts the
 * catalog in dependency order (game → set → cards → printings) via the
 * service-role admin client. Every write is keyed on the table's unique
 * constraint, so re-running is idempotent.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../lib/supabase/admin';
import {
  DEFAULT_LOCALE_CHAIN,
  fetchTcgdexSet,
  mapCardToRows,
  mapSetToRow,
  type CardPrintingRowInput,
  type CardRowInput,
} from '../lib/catalog/tcgdex-import';

const POKEMON_GAME_SLUG = 'pokemon';

interface ParsedArgs {
  setIds: string[];
  localeChain: string[];
  dryRun: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const setIds: string[] = [];
  let localeChain: string[] = [...DEFAULT_LOCALE_CHAIN];
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--set=')) {
      setIds.push(arg.slice('--set='.length));
    } else if (arg.startsWith('--locale=')) {
      localeChain = arg
        .slice('--locale='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return { setIds, localeChain, dryRun };
}

/** Resolves the existing `pokemon` game id without clobbering its curated row. */
async function resolvePokemonGameId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('tcg_games')
    .select('id')
    .eq('slug', POKEMON_GAME_SLUG)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load pokemon game: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      `No "${POKEMON_GAME_SLUG}" row in tcg_games — seed the game before importing sets.`,
    );
  }
  return data.id as string;
}

/** Upserts the set and returns its id. */
async function upsertSet(
  supabase: SupabaseClient,
  set: ReturnType<typeof mapSetToRow>,
): Promise<string> {
  const { data, error } = await supabase
    .from('card_sets')
    .upsert(set, { onConflict: 'game_id,slug' })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to upsert set "${set.slug}": ${error.message}`);
  }
  return data.id as string;
}

/** Upserts cards and returns a `slug → id` map for printing linkage. */
async function upsertCards(
  supabase: SupabaseClient,
  cards: readonly CardRowInput[],
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('cards')
    .upsert(cards, { onConflict: 'slug' })
    .select('id, slug');

  if (error) {
    throw new Error(`Failed to upsert cards: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; slug: string }>) {
    map.set(row.slug, row.id);
  }
  return map;
}

/** Upserts representative printings, linking each to its card id. */
async function upsertPrintings(
  supabase: SupabaseClient,
  printings: readonly CardPrintingRowInput[],
  cardIdBySlug: Map<string, string>,
): Promise<number> {
  const rows = printings.map((printing) => {
    const cardId = cardIdBySlug.get(printing.card_slug);
    if (!cardId) {
      throw new Error(`No card id for printing slug "${printing.card_slug}"`);
    }
    return {
      card_id: cardId,
      language: printing.language,
      region: printing.region,
      set_name: printing.set_name,
      set_code: printing.set_code,
      collector_number: printing.collector_number,
      rarity: printing.rarity,
      finish: printing.finish,
      image_url: printing.image_url,
      external_ids: printing.external_ids,
    };
  });

  const { error } = await supabase.from('card_printings').upsert(rows, {
    onConflict: 'card_id,language,region,set_code,collector_number,finish',
  });

  if (error) {
    throw new Error(`Failed to upsert printings: ${error.message}`);
  }
  return rows.length;
}

async function main(): Promise<void> {
  const { setIds, localeChain, dryRun } = parseArgs(process.argv.slice(2));

  if (setIds.length === 0) {
    throw new Error('Provide at least one --set=<tcgdexSetId> (e.g. --set=sv2a)');
  }

  const supabase = createAdminClient();
  const gameId = await resolvePokemonGameId(supabase);

  for (const setId of setIds) {
    const { set, locale, attempted } = await fetchTcgdexSet(setId, localeChain);
    const setRow = mapSetToRow(set, locale, gameId);
    const mapped = set.cards.map((card) =>
      mapCardToRows(card, { gameId, setId: set.id.toLowerCase(), setName: set.name, locale }),
    );
    const cards = mapped.map((entry) => entry.card);
    const printings = mapped.map((entry) => entry.printing);

    const skipped = attempted.length > 0 ? ` (skipped: ${attempted.join(', ')})` : '';
    console.log(
      `[${setId}] locale=${locale}${skipped} cards=${cards.length} dryRun=${dryRun}`,
    );

    if (dryRun) continue;

    const setDbId = await upsertSet(supabase, setRow);
    const cardsForSet = cards.map((card) => ({ ...card, set_id: setDbId }));
    const cardIdBySlug = await upsertCards(supabase, cardsForSet);
    const printingCount = await upsertPrintings(supabase, printings, cardIdBySlug);

    console.log(
      `[${setId}] upserted set=1 cards=${cardIdBySlug.size} printings=${printingCount}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
