import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PokemonCatalogCard, PokemonCategoryPageData } from '@/lib/tcg-catalog';
import { CardResults } from './_components/CardResults';
import { CategoryFilterBar } from './_components/CategoryFilterBar';
import { CategoryResultsToolbar } from './_components/CategoryResultsToolbar';
import { PokemonCategoryContent } from './_components/PokemonCategoryContent';

const replaceMock = vi.hoisted(() => vi.fn());
const searchParamsString = vi.hoisted(() => ({ current: '' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/categories/pokemon',
  useSearchParams: () => new URLSearchParams(searchParamsString.current),
}));

// radix Popover relies on a few DOM APIs jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('PokemonCategoryContent', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsString.current = '';
  });

  it('renders ten row cards with detail links', () => {
    const data = createCategoryData(10);

    render(<PokemonCategoryContent data={data} />);

    expect(screen.getAllByRole('link', { name: /상세 보기/ })).toHaveLength(10);
    expect(screen.getByRole('link', { name: '샘플 카드 1 상세 보기' }).getAttribute('href')).toBe(
      '/cards/kr-001-sample-card',
    );
  });

  it('renders an empty card state for an empty Pokemon catalog', () => {
    const data = createCategoryData(0);

    render(<PokemonCategoryContent data={data} />);

    expect(screen.getByRole('heading', { name: '등록된 카드가 없습니다' })).toBeTruthy();
  });

  it('shows the search result banner when a query is active', () => {
    const data = createCategoryData(3, '리자몽');

    render(<PokemonCategoryContent data={data} />);

    const banner = screen.getByText(/에 대한/);
    expect(banner.textContent).toContain("'리자몽'");
    expect(banner.textContent).toContain('3');
  });
});

describe('CategoryFilterBar', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsString.current = '';
  });

  function renderBar(overrides: Partial<React.ComponentProps<typeof CategoryFilterBar>> = {}) {
    return render(
      <CategoryFilterBar
        availableRarities={['AR', 'SAR']}
        availableSets={[
          { slug: 'pokemon-kr-151', name: '포켓몬 카드 151' },
          { slug: 'pokemon-kr-terastal-festa-ex', name: '테라스탈 페스타 ex' },
        ]}
        selectedRarities={[]}
        selectedSetSlugs={[]}
        {...overrides}
      />,
    );
  }

  it('exposes rarity and set options after opening the dropdowns', () => {
    renderBar();

    fireEvent.click(screen.getByRole('button', { name: /레어도/ }));
    expect(screen.getByLabelText('SAR')).toBeTruthy();
    expect(screen.getByLabelText('AR')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /세트/ }));
    expect(screen.getByLabelText('포켓몬 카드 151')).toBeTruthy();
    expect(screen.getByLabelText('테라스탈 페스타 ex')).toBeTruthy();
  });

  it('reflects the current selected filters as checked state', () => {
    renderBar({ selectedRarities: ['SAR'], selectedSetSlugs: ['pokemon-kr-151'] });

    fireEvent.click(screen.getByRole('button', { name: /레어도/ }));
    expect((screen.getByLabelText('SAR') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('AR') as HTMLInputElement).checked).toBe(false);
  });

  it('updates the URL when a rarity checkbox is toggled on', () => {
    renderBar();

    fireEvent.click(screen.getByRole('button', { name: /레어도/ }));
    fireEvent.click(screen.getByLabelText('SAR'));

    expect(replaceMock).toHaveBeenCalledWith('/categories/pokemon?rarity=SAR', { scroll: false });
  });

  it('removes the rarity key from the URL when all values are unchecked', () => {
    searchParamsString.current = 'rarity=SAR';
    renderBar({ selectedRarities: ['SAR'] });

    fireEvent.click(screen.getByRole('button', { name: /레어도/ }));
    fireEvent.click(screen.getByLabelText('SAR'));

    expect(replaceMock).toHaveBeenCalledWith('/categories/pokemon', { scroll: false });
  });

  it('appends multiple set selections as a comma list', () => {
    searchParamsString.current = 'set=pokemon-kr-151';
    renderBar({ selectedSetSlugs: ['pokemon-kr-151'] });

    fireEvent.click(screen.getByRole('button', { name: /세트/ }));
    fireEvent.click(screen.getByLabelText('테라스탈 페스타 ex'));

    expect(replaceMock).toHaveBeenCalledWith(
      '/categories/pokemon?set=pokemon-kr-151%2Cpokemon-kr-terastal-festa-ex',
      { scroll: false },
    );
  });

  it('preserves the existing query parameter when toggling a filter', () => {
    searchParamsString.current = 'q=리자몽';
    renderBar();

    fireEvent.click(screen.getByRole('button', { name: /레어도/ }));
    fireEvent.click(screen.getByLabelText('SAR'));

    expect(replaceMock).toHaveBeenCalledTimes(1);
    const [url] = replaceMock.mock.calls[0];
    expect(url).toContain('q=%EB%A6%AC%EC%9E%90%EB%AA%BD');
    expect(url).toContain('rarity=SAR');
  });

  it('resets the page param when a filter changes', () => {
    searchParamsString.current = 'page=3';
    renderBar();

    fireEvent.click(screen.getByRole('button', { name: /레어도/ }));
    fireEvent.click(screen.getByLabelText('SAR'));

    const [url] = replaceMock.mock.calls[0];
    expect(url).not.toContain('page=');
    expect(url).toContain('rarity=SAR');
  });

  it('clears all filters while keeping the query', () => {
    searchParamsString.current = 'q=리자몽&rarity=SAR&set=pokemon-kr-151';
    renderBar({ selectedRarities: ['SAR'], selectedSetSlugs: ['pokemon-kr-151'] });

    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));

    const [url] = replaceMock.mock.calls[0];
    expect(url).toContain('q=%EB%A6%AC%EC%9E%90%EB%AA%BD');
    expect(url).not.toContain('rarity=');
    expect(url).not.toContain('set=');
  });
});

describe('CategoryResultsToolbar', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsString.current = '';
  });

  it('shows the total result count', () => {
    render(<CategoryResultsToolbar totalCount={32051} sort='best' view='grid' />);

    expect(screen.getByText(/32,051/)).toBeTruthy();
  });

  it('updates the sort param when a sort option is chosen', () => {
    render(<CategoryResultsToolbar totalCount={10} sort='best' view='grid' />);

    fireEvent.click(screen.getByRole('button', { name: /추천순/ }));
    fireEvent.click(screen.getByRole('button', { name: '이름 A→Z' }));

    expect(replaceMock).toHaveBeenCalledWith('/categories/pokemon?sort=name-asc', { scroll: false });
  });

  it('switches to the list view via the view param', () => {
    render(<CategoryResultsToolbar totalCount={10} sort='best' view='grid' />);

    fireEvent.click(screen.getByRole('button', { name: '목록' }));

    expect(replaceMock).toHaveBeenCalledWith('/categories/pokemon?view=list', { scroll: false });
  });

  it('removes the view param when switching back to the grid view', () => {
    searchParamsString.current = 'view=list';
    render(<CategoryResultsToolbar totalCount={10} sort='best' view='list' />);

    fireEvent.click(screen.getByRole('button', { name: '격자' }));

    expect(replaceMock).toHaveBeenCalledWith('/categories/pokemon', { scroll: false });
  });
});

describe('CardResults pagination', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders page links when there is more than one page', () => {
    const cards = Array.from({ length: 24 }, (_, index) => createCard(index + 1));

    render(
      <CardResults
        initialCards={cards}
        totalCount={50}
        page={1}
        pageSize={24}
        sort='best'
        query=''
        rarities={[]}
        setSlugs={[]}
        view='grid'
      />,
    );

    expect(screen.getByRole('navigation', { name: '페이지네이션' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '2 페이지' }).getAttribute('href')).toBe(
      '/categories/pokemon?page=2',
    );
  });

  it('does not render pagination for a single page', () => {
    const cards = Array.from({ length: 3 }, (_, index) => createCard(index + 1));

    render(
      <CardResults
        initialCards={cards}
        totalCount={3}
        page={1}
        pageSize={24}
        sort='best'
        query=''
        rarities={[]}
        setSlugs={[]}
        view='grid'
      />,
    );

    expect(screen.queryByRole('navigation', { name: '페이지네이션' })).toBeNull();
  });

  it('preserves filters and sort in page links', () => {
    const cards = Array.from({ length: 24 }, (_, index) => createCard(index + 1));

    render(
      <CardResults
        initialCards={cards}
        totalCount={50}
        page={1}
        pageSize={24}
        sort='name-asc'
        query='리자몽'
        rarities={['SAR']}
        setSlugs={['pokemon-kr-151']}
        view='grid'
      />,
    );

    const href = screen.getByRole('link', { name: '2 페이지' }).getAttribute('href') ?? '';
    expect(href).toContain('q=%EB%A6%AC%EC%9E%90%EB%AA%BD');
    expect(href).toContain('rarity=SAR');
    expect(href).toContain('set=pokemon-kr-151');
    expect(href).toContain('sort=name-asc');
    expect(href).toContain('page=2');
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
    totalCount: count,
    page: 1,
    pageSize: 24,
    sort: 'best',
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
      currency: 'KRW',
      sampleCount: 0,
    },
    priceSnapshotCount: 0,
  };
}
