'use server';

import { getPokemonCategoryPageData, type PokemonCatalogCard } from '@/lib/tcg-catalog';
import { sortBySnapshotCount } from '../_lib/compare-search';

// ponytail: ranks within the first 50 name matches (fetched alphabetically), then
// by snapshot count desc. If a query commonly matches >50 cards, push the ORDER BY
// count into an RPC/view so ranking isn't limited to the candidate window.
const PICKER_CANDIDATE_LIMIT = 50;

/**
 * Name-search for the compare picker, ordered so data-rich cards (more price
 * snapshots) come first. Reuses the existing catalog query, then re-sorts.
 */
export async function searchComparableCards(query: string): Promise<PokemonCatalogCard[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const data = await getPokemonCategoryPageData({
    query: q,
    rarities: [],
    setSlugs: [],
    sort: 'name-asc',
    page: 1,
    pageSize: PICKER_CANDIDATE_LIMIT,
  });

  if (!data) return [];
  return sortBySnapshotCount(data.cards);
}
