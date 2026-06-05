/**
 * Removes the cards + printings of given sets (by slug) via the service-role
 * admin client, leaving the `card_sets` rows in place. Used to cleanly re-import
 * a set when its card slugs change (the importer inserts new rows rather than
 * updating when a slug changes, so stale rows must be cleared first).
 *
 * Usage (Node 20+ loads env from .env.local):
 *   node --env-file=.env.local --import tsx scripts/reset-sets.ts --slug=sm10 --slug=sv2a
 *   add --dry-run to report counts without deleting.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '../lib/supabase/admin';

function parseArgs(argv: readonly string[]): { slugs: string[]; dryRun: boolean; dropSet: boolean } {
  const slugs: string[] = [];
  let dryRun = false;
  let dropSet = false;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--drop-set') dropSet = true;
    else if (arg.startsWith('--slug=')) slugs.push(arg.slice('--slug='.length));
  }
  return { slugs, dryRun, dropSet };
}

async function setIdsForSlugs(supabase: SupabaseClient, slugs: string[]): Promise<string[]> {
  const { data, error } = await supabase.from('card_sets').select('id, slug').in('slug', slugs);
  if (error) throw new Error(`Failed to load sets: ${error.message}`);
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function cardIdsForSets(supabase: SupabaseClient, setIds: string[]): Promise<string[]> {
  if (setIds.length === 0) return [];
  const { data, error } = await supabase.from('cards').select('id').in('set_id', setIds);
  if (error) throw new Error(`Failed to load cards: ${error.message}`);
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function main(): Promise<void> {
  const { slugs, dryRun, dropSet } = parseArgs(process.argv.slice(2));
  if (slugs.length === 0) throw new Error('Provide at least one --slug=<setSlug>');

  const supabase = createAdminClient();
  const setIds = await setIdsForSlugs(supabase, slugs);
  const cardIds = await cardIdsForSets(supabase, setIds);

  console.log(`sets=${setIds.length} cards=${cardIds.length} dropSet=${dropSet} dryRun=${dryRun}`);
  if (dryRun) return;

  // PostgREST encodes `in` lists in the URL, so delete in chunks to stay within
  // the URL length limit.
  const CHUNK = 100;
  for (let i = 0; i < cardIds.length; i += CHUNK) {
    const batch = cardIds.slice(i, i + CHUNK);
    const { error: pErr } = await supabase.from('card_printings').delete().in('card_id', batch);
    if (pErr) throw new Error(`Failed to delete printings: ${pErr.message}`);
    const { error: cErr } = await supabase.from('cards').delete().in('id', batch);
    if (cErr) throw new Error(`Failed to delete cards: ${cErr.message}`);
  }
  console.log(`deleted printings + ${cardIds.length} cards for slugs: ${slugs.join(', ')}`);

  if (dropSet && setIds.length > 0) {
    const { error } = await supabase.from('card_sets').delete().in('slug', slugs);
    if (error) throw new Error(`Failed to delete sets: ${error.message}`);
    console.log(`dropped ${setIds.length} empty set row(s)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
