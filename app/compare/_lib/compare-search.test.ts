import { describe, expect, it } from 'vitest';
import type { PokemonCatalogCard } from '@/lib/tcg-catalog';
import { sortBySnapshotCount } from './compare-search';

function card(name: string, priceSnapshotCount: number): PokemonCatalogCard {
  return {
    slug: name,
    name,
    href: `/cards/${name}`,
    setName: 'Base',
    setSlug: 'base',
    rarity: 'Common',
    collectorNumber: '1',
    sampleId: name,
    imageUrl: null,
    price: null,
    priceSnapshotCount,
  };
}

describe('sortBySnapshotCount', () => {
  it('orders data-rich cards first', () => {
    const out = sortBySnapshotCount([card('a', 1), card('b', 25), card('c', 3)]);
    expect(out.map((c) => c.name)).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by name', () => {
    const out = sortBySnapshotCount([card('z', 5), card('a', 5)]);
    expect(out.map((c) => c.name)).toEqual(['a', 'z']);
  });

  it('does not mutate the input', () => {
    const input = [card('a', 1), card('b', 2)];
    sortBySnapshotCount(input);
    expect(input.map((c) => c.name)).toEqual(['a', 'b']);
  });
});
