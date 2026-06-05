import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { TcgCategoryOverview } from '@/lib/tcg-catalog';
import { CategoryOverviewList } from './page';

describe('CategoryOverviewList', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders top-level TCG category links from catalog overview data', () => {
    render(<CategoryOverviewList categories={categoryOverview} />);

    expect(
      screen.getByRole('link', { name: '포켓몬 카드 카테고리 열기' }).getAttribute('href'),
    ).toBe('/categories/pokemon');
    expect(
      screen.getByRole('link', { name: '매직 더 개더링 카테고리 열기' }).getAttribute('href'),
    ).toBe('/categories/magic');
    expect(screen.getByRole('link', { name: '유희왕 카테고리 열기' }).getAttribute('href')).toBe(
      '/categories/yugioh',
    );
    expect(screen.getByRole('link', { name: '원피스 카테고리 열기' }).getAttribute('href')).toBe(
      '/categories/one-piece',
    );
  });

  it('shows real aggregate counts and data statuses', () => {
    render(<CategoryOverviewList categories={categoryOverview} />);

    expect(screen.getByText('가격 추적 중')).toBeTruthy();
    expect(screen.getAllByText('준비 중')).toHaveLength(3);
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('renders an empty state without fake fallback categories', () => {
    render(<CategoryOverviewList categories={[]} />);

    expect(screen.getByRole('heading', { name: '연결된 카테고리가 없습니다' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /포켓몬/ })).toBeNull();
  });
});

const categoryOverview: TcgCategoryOverview[] = [
  {
    slug: 'pokemon',
    name: '포켓몬 카드',
    description: '검증된 한국판 포켓몬 대표 카드 카탈로그',
    href: '/categories/pokemon',
    cardCount: 10,
    setCount: 2,
    priceSnapshotCount: 4,
    status: 'live',
    statusLabel: '가격 추적 중',
  },
  {
    slug: 'yugioh',
    name: '유희왕',
    description: '유희왕 카드 카탈로그와 가격 추적 데이터를 준비 중입니다.',
    href: '/categories/yugioh',
    cardCount: 0,
    setCount: 0,
    priceSnapshotCount: 0,
    status: 'empty',
    statusLabel: '준비 중',
  },
  {
    slug: 'one-piece',
    name: '원피스',
    description: '원피스 리더 카드와 주요 수입판 카탈로그를 준비 중입니다.',
    href: '/categories/one-piece',
    cardCount: 0,
    setCount: 0,
    priceSnapshotCount: 0,
    status: 'empty',
    statusLabel: '준비 중',
  },
  {
    slug: 'magic',
    name: '매직 더 개더링',
    description: '매직 카탈로그를 준비 중입니다.',
    href: '/categories/magic',
    cardCount: 0,
    setCount: 0,
    priceSnapshotCount: 0,
    status: 'empty',
    statusLabel: '준비 중',
  },
];
