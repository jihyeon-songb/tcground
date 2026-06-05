'use server';

import {
  DEFAULT_POKEMON_PAGE_SIZE,
  getPokemonCategoryPageData,
  type PokemonCatalogCard,
  type PokemonSort,
} from '@/lib/tcg-catalog';

export interface LoadPokemonCardsInput {
  query: string;
  rarities: string[];
  setSlugs: string[];
  sort: PokemonSort;
  page: number;
}

export interface LoadPokemonCardsResult {
  cards: PokemonCatalogCard[];
  hasMore: boolean;
  totalCount: number;
}

/**
 * Fetches a single page of Pokémon catalog cards. Used by the client list for
 * mobile infinite scroll (appending the next page on demand).
 */
export async function loadPokemonCards({
  query,
  rarities,
  setSlugs,
  sort,
  page,
}: LoadPokemonCardsInput): Promise<LoadPokemonCardsResult> {
  const pageSize = DEFAULT_POKEMON_PAGE_SIZE;
  const data = await getPokemonCategoryPageData({
    query,
    rarities,
    setSlugs,
    sort,
    page,
    pageSize,
  });

  if (!data) {
    return { cards: [], hasMore: false, totalCount: 0 };
  }

  return {
    cards: data.cards,
    hasMore: data.page * data.pageSize < data.totalCount,
    totalCount: data.totalCount,
  };
}
