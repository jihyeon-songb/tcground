import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCardDetail } from '@/lib/tcg-catalog';
import CardDetailPage, { CardDetailContent, buildChartGeometry } from './page';
import { CardRating } from './_components/CardRating';
import { CardDetailScrollReset } from './_components/CardDetailScrollReset';
import type { PricePoint } from '@/lib/tcg-catalog';

const getCardDetailBySlugMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);

vi.mock('@/lib/tcg-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tcg-catalog')>();

  return {
    ...actual,
    getCardDetailBySlug: getCardDetailBySlugMock,
  };
});

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

describe('CardDetailContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders DB detail view model fields', () => {
    render(<CardDetailContent card={createCardDetail()} />);

    expect(screen.getByRole('heading', { name: '리자몽 ex' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '포켓몬 카드 151' })).toBeTruthy();
    expect(screen.getAllByText('SAR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('201/165').length).toBeGreaterThan(0);
    expect(screen.getByText('BS2023014201')).toBeTruthy();
  });

  it('shows a stale-price warning caption when the price is over 7 days old', () => {
    const base = createCardDetail();
    if (!base.price) throw new Error('fixture requires a price');
    render(<CardDetailContent card={{ ...base, price: { ...base.price, stalenessDays: 8 } }} />);
    expect(screen.getByText('마지막 수집 8일 전 · 현재 매물 여부 미확인')).toBeTruthy();
  });

  it('shows a neutral staleness caption within 7 days', () => {
    const base = createCardDetail();
    if (!base.price) throw new Error('fixture requires a price');
    render(<CardDetailContent card={{ ...base, price: { ...base.price, stalenessDays: 3 } }} />);
    expect(screen.getByText('마지막 수집 3일 전 · 현재 매물 여부 미확인')).toBeTruthy();
  });

  it('labels the summary as average asking price', () => {
    render(<CardDetailContent card={createCardDetail()} />);
    expect(screen.getByText('평균 판매 호가')).toBeTruthy();
    expect(screen.queryByText('평균 거래가')).toBeNull();
  });

  it('shows no-price state without fabricated values or alerts', () => {
    const card = { ...createCardDetail(), price: null };
    render(<CardDetailContent card={card} alertSlot={<button>가격 알림</button>} />);
    expect(screen.getByText('시세 정보 없음')).toBeTruthy();
    expect(screen.queryByText('₩120,000')).toBeNull();
    expect(screen.queryByRole('button', { name: '가격 알림' })).toBeNull();
  });

  it('shows the public rating average and a sign-in prompt for guests', () => {
    const card = createCardDetail();
    render(
      <CardDetailContent
        card={card}
        ratingSlot={
          <CardRating
            cardId={card.cardId}
            slug={card.slug}
            summary={{ average: 4.2, count: 12 }}
            viewerRating={null}
            isAuthenticated={false}
          />
        }
      />,
    );

    expect(screen.getByText('4.2')).toBeTruthy();
    expect(screen.getByText('12개 평가')).toBeTruthy();
    expect(screen.getByRole('link', { name: '로그인' })).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: '카드 평점 선택' })).toBeNull();
  });

  it('renders edition selector links with Korean selected by default', () => {
    render(<CardDetailContent card={createCardDetail()} />);

    const korean = screen.getByRole('link', { name: '한국판' });
    const japanese = screen.getByRole('link', { name: '일본판' });
    const american = screen.getByRole('link', { name: '미국판' });

    expect(korean.getAttribute('aria-current')).toBe('page');
    expect(korean.getAttribute('href')).toBe('/cards/kr-004-charizard-ex-151');
    expect(japanese.getAttribute('href')).toBe('/cards/kr-004-charizard-ex-151?edition=jp');
    expect(american.getAttribute('href')).toBe('/cards/kr-004-charizard-ex-151?edition=na');
  });
});

describe('CardDetailScrollReset', () => {
  afterEach(() => {
    cleanup();
  });

  it('scrolls the detail page to the top when the card path changes', () => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });

    const { rerender } = render(<CardDetailScrollReset currentPath='/cards/first' />);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });

    rerender(<CardDetailScrollReset currentPath='/cards/second' />);

    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });
});

describe('buildChartGeometry', () => {
  function point(date: string, avgPrice: number): PricePoint {
    return {
      date,
      avgPrice,
      minPrice: avgPrice,
      maxPrice: avgPrice,
      sampleCount: 1,
      currency: 'USD',
      sourceNames: ['ebay_browse'],
    };
  }

  it('scales the trend line to fill the chart from the asking series alone', () => {
    const geometry = buildChartGeometry(
      [point('2026-05-16', 150), point('2026-05-22', 162), point('2026-05-29', 168)],
      [],
    );

    expect(geometry.linePoints[0].x).toBeCloseTo(0);
    expect(geometry.linePoints[geometry.linePoints.length - 1].x).toBeCloseTo(100);
    // lowest price sits at the band bottom, highest at the band top
    expect(Math.max(...geometry.linePoints.map((p) => p.y))).toBeCloseTo(44);
    expect(Math.min(...geometry.linePoints.map((p) => p.y))).toBeCloseTo(6);
  });

  it('keeps only overlay points inside the trend window', () => {
    const geometry = buildChartGeometry(
      [point('2026-05-16', 150), point('2026-05-29', 168)],
      [point('2026-01-10', 140), point('2026-05-20', 158)],
    );

    // the January sale is outside the asking window and is dropped
    expect(geometry.overlayPoints).toHaveLength(1);
    expect(geometry.overlayPoints[0].x).toBeGreaterThan(0);
    expect(geometry.overlayPoints[0].x).toBeLessThan(100);
  });

  it('reports no data when both series are empty', () => {
    expect(buildChartGeometry([], []).hasData).toBe(false);
  });
});

describe('CardDetailPage', () => {
  beforeEach(() => {
    getCardDetailBySlugMock.mockReset();
    notFoundMock.mockClear();
  });

  it('calls notFound for an unknown card slug', async () => {
    getCardDetailBySlugMock.mockResolvedValue(null);

    await expect(
      CardDetailPage({
        params: Promise.resolve({ cardId: 'missing-card' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(getCardDetailBySlugMock).toHaveBeenCalledWith('missing-card', undefined, {
      edition: 'kr',
    });
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('passes the selected edition query to the detail loader', async () => {
    getCardDetailBySlugMock.mockResolvedValue(null);

    await expect(
      CardDetailPage({
        params: Promise.resolve({ cardId: 'missing-card' }),
        searchParams: Promise.resolve({ edition: 'jp' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(getCardDetailBySlugMock).toHaveBeenCalledWith('missing-card', undefined, {
      edition: 'jp',
    });
  });
});

function createCardDetail(): CatalogCardDetail {
  return {
    cardId: 'card-kr-004',
    slug: 'kr-004-charizard-ex-151',
    metaTitle: 'TCGround | 리자몽 ex - 포켓몬 카드 151',
    metaDescription: '포켓몬 카드 151 리자몽 ex 카드 상세',
    chips: ['포켓몬 카드', '포켓몬 카드 151', 'SAR', '201/165'],
    cardName: '리자몽 ex',
    setLabel: '포켓몬 카드 151',
    collectorNumber: '201/165',
    rarity: 'SAR',
    imageUrl: null,
    selectedEdition: 'kr',
    editionOptions: [
      {
        value: 'kr',
        label: '한국판',
        shortLabel: 'KR',
        isSelected: true,
        isAvailable: true,
        printingId: 'printing-kr-004',
      },
      {
        value: 'jp',
        label: '일본판',
        shortLabel: 'JP',
        isSelected: false,
        isAvailable: true,
        printingId: 'printing-jp-004',
      },
      {
        value: 'na',
        label: '미국판',
        shortLabel: 'US',
        isSelected: false,
        isAvailable: true,
        printingId: 'printing-na-004',
      },
    ],
    price: {
      avgPrice: 120000,
      minPrice: 98000,
      maxPrice: 151000,
      changeRate: 2.1,
      changeTone: 'up',
      lastUpdatedAt: '2026년 5월 22일',
      stalenessDays: 0,
      sourceLabel: '가격 데이터 연결 전까지 카탈로그 대표값을 표시합니다.',
      currency: 'KRW',
      sampleCount: 0,
    },
    priceHistory: {
      askingSeries: [
        {
          date: '2026-05-28',
          avgPrice: 162,
          minPrice: 140,
          maxPrice: 210,
          sampleCount: 3,
          currency: 'USD',
          sourceNames: ['ebay_browse'],
        },
        {
          date: '2026-05-29',
          avgPrice: 168,
          minPrice: 150,
          maxPrice: 205,
          sampleCount: 4,
          currency: 'USD',
          sourceNames: ['ebay_browse'],
        },
      ],
      soldPoints: [],
      currency: 'USD',
      gradeLabel: null,
      hasData: true,
    },
    ebayListings: [],
    featuredListingIndex: -1,
    marketplaceFallbackLink: {
      kind: 'search',
      href: 'https://www.ebay.com/sch/i.html?_nkw=Charizard',
      sourceLabel: 'eBay',
      actionLabel: 'eBay에서 검색',
    },
    printing: {
      id: 'printing-kr-004',
      language: 'ko',
      region: 'KR',
      setCode: 'BS2023014201',
      collectorNumber: '201/165',
      finish: 'unknown',
      sampleId: 'PKMKR-BS2023014201',
      nameEn: 'Charizard ex',
      nameJa: 'リザードンex',
    },
    backHref: '/categories/pokemon',
    backLabel: '포켓몬 카테고리로 돌아가기',
  };
}
