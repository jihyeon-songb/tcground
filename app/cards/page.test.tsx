import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { featuredCards } from '@/lib/tcg-data';
import { FeaturedCardsGrid } from './page';

describe('FeaturedCardsGrid', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders featured card links with price summaries', () => {
    render(<FeaturedCardsGrid cards={featuredCards} />);

    expect(screen.getByRole('heading', { name: '인기 카드 목록' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /피카츄 ex SAR/ }).getAttribute('href')).toBe(
      '/cards/pikachu-ex-sar',
    );
    expect(screen.getByText('₩168,000')).toBeTruthy();
    expect(screen.getByText('₩142,000')).toBeTruthy();
    expect(screen.getByText('₩219,000')).toBeTruthy();
  });

  it('renders an empty state when there are no featured cards', () => {
    render(<FeaturedCardsGrid cards={[]} />);

    expect(screen.getByRole('heading', { name: '아직 표시할 인기 카드가 없습니다' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '카드 검색하기' }).getAttribute('href')).toBe(
      '/search',
    );
  });
});
