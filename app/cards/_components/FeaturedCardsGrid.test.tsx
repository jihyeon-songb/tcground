import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PokemonCatalogCard } from '@/lib/tcg-catalog';
import { FeaturedCardsGrid } from './FeaturedCardsGrid';

describe('FeaturedCardsGrid', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders featured card links with price summaries and images', () => {
    const cards: PokemonCatalogCard[] = [
      makeCard({
        slug: 'kr-004-charizard-ex-151',
        name: '리자몽 ex',
        avgPrice: 168000,
        minPrice: 142000,
        maxPrice: 219000,
        imageUrl: 'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp',
      }),
    ];

    render(<FeaturedCardsGrid cards={cards} />);

    expect(screen.getByRole('heading', { name: '인기 카드 목록' })).toBeTruthy();
    const link = screen.getByRole('link', { name: '리자몽 ex 상세 보기' });
    expect(link.getAttribute('href')).toBe('/cards/kr-004-charizard-ex-151');
    const imageSrc = link.querySelector('img')?.getAttribute('src') ?? '';
    expect(imageSrc).toContain('/_next/image');
    expect(decodeURIComponent(imageSrc)).toContain(
      'https://assets.tcgdex.net/ja/SV/SV2a/201/high.webp',
    );
    expect(screen.getByText('₩168,000')).toBeTruthy();
    expect(screen.getByText('₩142,000')).toBeTruthy();
    expect(screen.getByText('₩219,000')).toBeTruthy();
  });

  it('renders an empty state when there are no featured cards', () => {
    render(<FeaturedCardsGrid cards={[]} />);

    expect(screen.getByRole('heading', { name: '아직 표시할 인기 카드가 없습니다' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '카드 검색하기' }).getAttribute('href')).toBe(
      '/categories/pokemon',
    );
  });
});

function makeCard({
  slug,
  name,
  avgPrice,
  minPrice,
  maxPrice,
  imageUrl,
}: {
  slug: string;
  name: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  imageUrl: string | null;
}): PokemonCatalogCard {
  return {
    slug,
    name,
    href: `/cards/${slug}`,
    setName: '포켓몬 카드 151',
    setSlug: 'pokemon-kr-151',
    rarity: 'SAR',
    collectorNumber: '201/165',
    sampleId: 'PKMKR-BS2023014201',
    imageUrl,
    price: {
      avgPrice,
      minPrice,
      maxPrice,
      changeRate: 2.1,
      changeTone: 'up',
      lastUpdatedAt: '2026년 5월 22일',
      sourceLabel: '카탈로그 대표값',
      currency: 'KRW',
      sampleCount: 0,
    },
    priceSnapshotCount: 0,
  };
}
