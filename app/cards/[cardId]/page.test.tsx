import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCardDetail } from '@/lib/tcg-catalog';
import CardDetailPage, { CardDetailContent } from './page';

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
