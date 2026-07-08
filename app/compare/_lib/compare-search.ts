import type { PokemonCatalogCard } from '@/lib/tcg-catalog';

/**
 * Orders picker candidates by price-snapshot count (data-rich cards first) so the
 * cards that actually render a comparison line surface at the top. Ties break by
 * name for a stable order.
 */
export function sortBySnapshotCount(cards: readonly PokemonCatalogCard[]): PokemonCatalogCard[] {
  return [...cards].sort(
    (a, b) => b.priceSnapshotCount - a.priceSnapshotCount || a.name.localeCompare(b.name),
  );
}
