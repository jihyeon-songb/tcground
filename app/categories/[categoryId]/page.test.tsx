import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PokemonCatalogCard, PokemonCategoryPageData } from '@/lib/tcg-catalog';
import { PokemonCardSection, PokemonCategoryContent } from './page';

describe('PokemonCategoryContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders ten DB view model cards with detail links', () => {
    const data = createCategoryData(10);

    render(<PokemonCategoryContent data={data} />);

    expect(screen.getByRole('heading', { name: '등록 카드' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /상세 보기/ })).toHaveLength(10);
    expect(screen.getByRole('link', { name: '샘플 카드 1 상세 보기' }).getAttribute('href')).toBe(
      '/cards/kr-001-sample-card',
    );
  });

  it('renders an empty card state for an empty Pokemon catalog', () => {
    render(<PokemonCardSection cards={[]} />);

    expect(screen.getByRole('heading', { name: '등록된 카드가 없습니다' })).toBeTruthy();
  });
});

function createCategoryData(count: number): PokemonCategoryPageData {
  const cards = Array.from({ length: count }, (_, index) => createCard(index + 1));

  return {
    gameName: 'Pokemon TCG',
    gameNameKo: '포켓몬 카드',
    description: '검증된 한국판 포켓몬 대표 카드 카탈로그',
    sets: [
      {
        slug: 'pokemon-kr-151',
        name: '포켓몬 카드 151',
        href: '/categories/pokemon/pokemon-kr-151',
        cardCount: count,
      },
    ],
    cards,
  };
}

function createCard(index: number): PokemonCatalogCard {
  const paddedIndex = String(index).padStart(3, '0');

  return {
    slug: `kr-${paddedIndex}-sample-card`,
    name: `샘플 카드 ${index}`,
    href: `/cards/kr-${paddedIndex}-sample-card`,
    setName: '포켓몬 카드 151',
    setSlug: 'pokemon-kr-151',
    rarity: index === 6 ? 'AR' : 'SAR',
    collectorNumber: `${200 + index}/165`,
    sampleId: `KR-${paddedIndex}`,
    imageUrl: null,
    price: {
      avgPrice: 100000 + index,
      minPrice: 80000 + index,
      maxPrice: 130000 + index,
      changeRate: 2.1,
      changeTone: 'up',
      lastUpdatedAt: '2026년 5월 22일',
      sourceLabel: '가격 데이터 연결 전까지 카탈로그 대표값을 표시합니다.',
    },
  };
}
