import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicHeader } from './PublicHeader';

const getClaimsMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('./logout-action', () => ({
  logout: vi.fn(),
}));

describe('PublicHeader', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getClaimsMock.mockReset();
    createClientMock.mockResolvedValue({
      auth: {
        getClaims: getClaimsMock,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders login and signup links when the user is signed out', async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: null },
      error: null,
    });

    render(await PublicHeader({ currentPath: '/search?q=Charizard' }));

    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe(
      '/login?next=%2Fsearch%3Fq%3DCharizard',
    );
    expect(screen.getByRole('link', { name: '가입하기' }).getAttribute('href')).toBe(
      '/signup?next=%2Fsearch%3Fq%3DCharizard',
    );
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull();
  });

  it('renders the MVP primary navigation labels and routes', async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: null },
      error: null,
    });

    render(await PublicHeader({ currentPath: '/categories/pokemon' }));

    expect(screen.getByRole('link', { name: '홈' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: '검색' }).getAttribute('href')).toBe('/search');
    expect(screen.getByRole('link', { name: '카테고리' }).getAttribute('href')).toBe('/categories');
    expect(screen.getByRole('link', { name: '인기' }).getAttribute('href')).toBe('/cards');
    expect(screen.queryByRole('link', { name: '탐색' })).toBeNull();
    expect(screen.queryByRole('link', { name: '세트' })).toBeNull();
    expect(screen.queryByRole('link', { name: '가격 가이드' })).toBeNull();
  });

  it('keeps root auth links without next query params', async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: null },
      error: null,
    });

    render(await PublicHeader({ currentPath: '/' }));

    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: '가입하기' }).getAttribute('href')).toBe('/signup');
  });

  it('renders only the logout button when the user is signed in', async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: { sub: 'user-id' } },
      error: null,
    });

    render(await PublicHeader({ currentPath: '/cards/charizard-base-set-1st-edition' }));

    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
    expect(screen.queryByRole('link', { name: '가입하기' })).toBeNull();
  });

  it('falls back to signed-out links when claims cannot be read', async () => {
    getClaimsMock.mockRejectedValue(new Error('network'));

    render(await PublicHeader({ currentPath: 'https://example.com/cards' }));

    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: '가입하기' }).getAttribute('href')).toBe('/signup');
  });
});
