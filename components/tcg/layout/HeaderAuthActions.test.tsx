import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderAuthActions } from './HeaderAuthActions';

const getClaimsMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/components/tcg/auth/logout-action', () => ({
  logout: vi.fn(),
}));

describe('HeaderAuthActions', () => {
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

    render(await HeaderAuthActions({ currentPath: '/categories/pokemon?q=Charizard' }));

    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe(
      '/login?next=%2Fcategories%2Fpokemon%3Fq%3DCharizard',
    );
    expect(screen.getByRole('link', { name: '가입하기' }).getAttribute('href')).toBe(
      '/signup?next=%2Fcategories%2Fpokemon%3Fq%3DCharizard',
    );
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull();
  });

  it('keeps root auth links without next query params', async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: null },
      error: null,
    });

    render(await HeaderAuthActions({ currentPath: '/' }));

    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: '가입하기' }).getAttribute('href')).toBe('/signup');
  });

  it('renders only the logout button when the user is signed in', async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: { sub: 'user-id' } },
      error: null,
    });

    render(await HeaderAuthActions({ currentPath: '/cards/charizard-base-set-1st-edition' }));

    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
    expect(screen.queryByRole('link', { name: '가입하기' })).toBeNull();
  });

  it('falls back to signed-out links when claims cannot be read', async () => {
    getClaimsMock.mockRejectedValue(new Error('network'));

    render(await HeaderAuthActions({ currentPath: 'https://example.com/cards' }));

    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: '가입하기' }).getAttribute('href')).toBe('/signup');
  });
});
