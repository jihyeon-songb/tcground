import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCardDetail } from '@/lib/tcg-catalog';
import CardDetailPage, { CardDetailContent, buildChartGeometry } from './page';
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
    render(
      <CardDetailContent
        card={createCardDetail()}
        ratingSummary={{ average: 4.2, count: 12 }}
        viewerRating={null}
        isAuthenticated={false}
      />,
    );

    expect(screen.getByRole('heading', { name: '리자몽 ex' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '포켓몬 카드 151' })).toBeTruthy();
    expect(screen.getAllByText('SAR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('201/165').length).toBeGreaterThan(0);
    expect(screen.getByText('BS2023014201')).toBeTruthy();
  });

  it('shows the public rating average and a sign-in prompt for guests', () => {
    render(
      <CardDetailContent
        card={createCardDetail()}
        ratingSummary={{ average: 4.2, count: 12 }}
        viewerRating={null}
        isAuthenticated={false}
      />,
    );

    expect(screen.getByText('4.2')).toBeTruthy();
    expect(screen.getByText('12개 평가')).toBeTruthy();
    expect(screen.getByRole('link', { name: '로그인' })).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: '카드 평점 선택' })).toBeNull();
  });
});

describe('buildChartGeometry', () => {
  function point(date: string, avgPrice: number): PricePoint {
    return { date, avgPrice, minPrice: avgPrice, maxPrice: avgPrice, sampleCount: 1, currency: 'USD' };
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

    expect(getCardDetailBySlugMock).toHaveBeenCalledWith('missing-card');
    expect(notFoundMock).toHaveBeenCalled();
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
    price: {
      avgPrice: 120000,
      minPrice: 98000,
      maxPrice: 151000,
      changeRate: 2.1,
      changeTone: 'up',
      lastUpdatedAt: '2026년 5월 22일',
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
        },
        {
          date: '2026-05-29',
          avgPrice: 168,
          minPrice: 150,
          maxPrice: 205,
          sampleCount: 4,
          currency: 'USD',
        },
      ],
      soldPoints: [],
      currency: 'USD',
      gradeLabel: null,
      hasData: true,
    },
    printing: {
      id: 'printing-kr-004',
      language: 'ko',
      region: 'KR',
      setCode: 'BS2023014201',
      collectorNumber: '201/165',
      finish: 'unknown',
      sampleId: 'KR-004',
    },
    backHref: '/categories/pokemon',
    backLabel: '포켓몬 카테고리로 돌아가기',
  };
}
