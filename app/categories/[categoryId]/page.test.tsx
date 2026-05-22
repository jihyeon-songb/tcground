import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PokemonCatalogCard, PokemonCategoryPageData } from '@/lib/tcg-catalog';
import { PokemonCardSection, PokemonCategoryContent } from './page';

const replaceMock = vi.hoisted(() => vi.fn());
const searchParamsString = vi.hoisted(() => ({ current: '' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/categories/pokemon',
  useSearchParams: () => new URLSearchParams(searchParamsString.current),
}));

describe('PokemonCategoryContent', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsString.current = '';
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

  it('shows the search result banner when a query is active', () => {
    const data = createCategoryData(3, '리자몽');

    render(<PokemonCategoryContent data={data} />);

    const banner = screen.getByText(/에 대한/);
    expect(banner.textContent).toContain("'리자몽'");
    expect(banner.textContent).toContain('3');
    expect(screen.getByRole('heading', { name: '등록 카드' })).toBeTruthy();
  });

  it('does not render the legacy 등록 세트 grid', () => {
    const data = createCategoryData(3);

    render(<PokemonCategoryContent data={data} />);

    expect(screen.queryByRole('heading', { name: '등록 세트' })).toBeNull();
  });

  it('renders filter sidebar with all available rarities and sets', () => {
    const data = createCategoryData(3);

    render(<PokemonCategoryContent data={data} />);

    expect(screen.getByLabelText('SAR')).toBeTruthy();
    expect(screen.getByLabelText('AR')).toBeTruthy();
    expect(screen.getByLabelText('포켓몬 카드 151')).toBeTruthy();
    expect(screen.getByLabelText('테라스탈 페스타 ex')).toBeTruthy();
  });

  it('reflects the current selected filters as checked state', () => {
    const data = createCategoryData(3);
    data.selectedRarities = ['SAR'];
    data.selectedSetSlugs = ['pokemon-kr-151'];

    render(<PokemonCategoryContent data={data} />);

    expect((screen.getByLabelText('SAR') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('AR') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('포켓몬 카드 151') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('테라스탈 페스타 ex') as HTMLInputElement).checked).toBe(false);
  });

  it('updates the URL when a rarity checkbox is toggled on', () => {
    const data = createCategoryData(3);

    render(<PokemonCategoryContent data={data} />);

    fireEvent.click(screen.getByLabelText('SAR'));

    expect(replaceMock).toHaveBeenCalledWith('/categories/pokemon?rarity=SAR', { scroll: false });
  });

  it('removes the rarity key from the URL when all values are unchecked', () => {
    searchParamsString.current = 'rarity=SAR';
    const data = createCategoryData(3);
    data.selectedRarities = ['SAR'];

    render(<PokemonCategoryContent data={data} />);

    fireEvent.click(screen.getByLabelText('SAR'));

    expect(replaceMock).toHaveBeenCalledWith('/categories/pokemon', { scroll: false });
  });

  it('appends multiple set selections as a comma list', () => {
    searchParamsString.current = 'set=pokemon-kr-151';
    const data = createCategoryData(3);
    data.selectedSetSlugs = ['pokemon-kr-151'];

    render(<PokemonCategoryContent data={data} />);

    fireEvent.click(screen.getByLabelText('테라스탈 페스타 ex'));

    expect(replaceMock).toHaveBeenCalledWith(
      '/categories/pokemon?set=pokemon-kr-151%2Cpokemon-kr-terastal-festa-ex',
      { scroll: false },
    );
  });

  it('preserves the existing query parameter when toggling a filter', () => {
    searchParamsString.current = 'q=리자몽';
    const data = createCategoryData(3, '리자몽');

    render(<PokemonCategoryContent data={data} />);

    fireEvent.click(screen.getByLabelText('SAR'));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    const [url] = replaceMock.mock.calls[0];
    expect(url).toContain('q=%EB%A6%AC%EC%9E%90%EB%AA%BD');
    expect(url).toContain('rarity=SAR');
  });
});

function createCategoryData(count: number, query = ''): PokemonCategoryPageData {
  const cards = Array.from({ length: count }, (_, index) => createCard(index + 1));

  return {
    gameName: 'Pokemon TCG',
    gameNameKo: '포켓몬 카드',
    description: '검증된 한국판 포켓몬 대표 카드 카탈로그',
    availableSets: [
      { slug: 'pokemon-kr-151', name: '포켓몬 카드 151' },
      { slug: 'pokemon-kr-terastal-festa-ex', name: '테라스탈 페스타 ex' },
    ],
    availableRarities: ['AR', 'SAR'],
    selectedRarities: [],
    selectedSetSlugs: [],
    cards,
    query,
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
