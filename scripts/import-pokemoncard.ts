/**
 * Korean catalog import script (pokemoncard.co.kr → Supabase).
 *
 * Usage (Node 20+ loads env from .env.local):
 *   node --env-file=.env.local --import tsx scripts/import-pokemoncard.ts --set="썬&문 확장팩 「더블블레이즈」"
 *   node --env-file=.env.local --import tsx scripts/import-pokemoncard.ts --set="..." --set="..."
 *   add --dry-run to fetch + parse without writing to the DB.
 *
 * Each `--set` is an exact Korean set name (the site's GoodsName / "제품명"
 * dropdown value). The script lists the set's cards, fetches each detail page
 * for its Korean fields, and upserts the catalog in dependency order
 * (set → cards → printings) via the service-role admin client. Every write is
 * keyed on the table's unique constraint, so re-running is idempotent.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../lib/supabase/admin';
import {
  fetchCardDetail,
  fetchSetCardRefs,
  mapCardToRows,
  mapSetToRow,
  type MappedCard,
  type ParsedCard,
} from '../lib/catalog/pokemoncard-import';

const POKEMON_GAME_SLUG = 'pokemon';
/** Concurrent detail-page fetches. Kept low to stay polite to the source. */
const DETAIL_CONCURRENCY = 6;

interface ParsedArgs {
  setNames: string[];
  dryRun: boolean;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const setNames: string[] = [];
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--set=')) setNames.push(arg.slice('--set='.length));
  }

  return { setNames, dryRun };
}

async function resolvePokemonGameId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('tcg_games')
    .select('id')
    .eq('slug', POKEMON_GAME_SLUG)
    .maybeSingle();

  if (error) throw new Error(`Failed to load pokemon game: ${error.message}`);
  if (!data) {
    throw new Error(`No "${POKEMON_GAME_SLUG}" row in tcg_games — seed the game first.`);
  }
  return data.id as string;
}

/** Fetches detail pages for refs with bounded concurrency, preserving order. */
async function fetchAllDetails(cardNums: readonly string[]): Promise<ParsedCard[]> {
  const results: Array<ParsedCard | null> = new Array(cardNums.length).fill(null);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < cardNums.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fetchCardDetail(cardNums[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, cardNums.length) }, worker),
  );
  return results.filter((card): card is ParsedCard => card !== null);
}

async function upsertSet(
  supabase: SupabaseClient,
  set: ReturnType<typeof mapSetToRow>,
): Promise<string> {
  const { data, error } = await supabase
    .from('card_sets')
    .upsert(set, { onConflict: 'game_id,slug' })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to upsert set "${set.slug}": ${error.message}`);
  return data.id as string;
}

async function upsertCards(
  supabase: SupabaseClient,
  cards: ReadonlyArray<MappedCard['card']>,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('cards')
    .upsert(cards, { onConflict: 'slug' })
    .select('id, slug');

  if (error) throw new Error(`Failed to upsert cards: ${error.message}`);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; slug: string }>) {
    map.set(row.slug, row.id);
  }
  return map;
}

async function upsertPrintings(
  supabase: SupabaseClient,
  printings: ReadonlyArray<MappedCard['printing']>,
  cardIdBySlug: Map<string, string>,
): Promise<number> {
  const rows = printings.map((printing) => {
    const cardId = cardIdBySlug.get(printing.card_slug);
    if (!cardId) throw new Error(`No card id for printing slug "${printing.card_slug}"`);
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

  if (error) throw new Error(`Failed to upsert printings: ${error.message}`);
  return rows.length;
}

/** Picks the set code shared by the parsed cards (the most common non-null). */
function resolveSetCode(cards: readonly ParsedCard[]): string | null {
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (card.setCode) counts.set(card.setCode, (counts.get(card.setCode) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [code, count] of counts) {
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }
  return best;
}

async function main(): Promise<void> {
  const { setNames, dryRun } = parseArgs(process.argv.slice(2));

  if (setNames.length === 0) {
    throw new Error('Provide at least one --set="<Korean set name>"');
  }

  const supabase = createAdminClient();
  const gameId = await resolvePokemonGameId(supabase);

  for (const setName of setNames) {
    const refs = await fetchSetCardRefs(setName);
    const parsed = await fetchAllDetails(refs.map((ref) => ref.cardNum));
    const setCode = resolveSetCode(parsed);

    if (!setCode) {
      console.warn(`[${setName}] no set code resolved (cards=${parsed.length}) — skipping`);
      continue;
    }

    const mapped = parsed.map((card) => mapCardToRows(card, { gameId, setName, setCode }));
    console.log(
      `[${setName}] code=${setCode} refs=${refs.length} parsed=${parsed.length} dryRun=${dryRun}`,
    );

    if (dryRun) {
      for (const { card } of mapped.slice(0, 5)) {
        console.log(`   ${card.collector_number}\t${card.rarity ?? '-'}\t${card.name}`);
      }
      if (mapped.length > 5) console.log(`   … +${mapped.length - 5} more`);
      continue;
    }

    const setDbId = await upsertSet(supabase, mapSetToRow(setName, setCode, gameId));
    const cardsForSet = mapped.map((entry) => ({ ...entry.card, set_id: setDbId }));
    const cardIdBySlug = await upsertCards(supabase, cardsForSet);
    const printingCount = await upsertPrintings(
      supabase,
      mapped.map((entry) => entry.printing),
      cardIdBySlug,
    );

    console.log(
      `[${setName}] upserted set=1 cards=${cardIdBySlug.size} printings=${printingCount}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
