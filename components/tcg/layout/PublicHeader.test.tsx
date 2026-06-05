import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicHeader } from './PublicHeader';

// The auth-dependent buttons render inside a Suspense boundary via
// `HeaderAuthActions` (covered by its own test). Stub it out so these tests
// focus on the static header shell — logo, nav, search.
vi.mock('./HeaderAuthActions', () => ({
  HeaderAuthActions: () => null,
  HeaderAuthActionsFallback: () => null,
}));

describe('PublicHeader', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the MVP primary navigation labels and routes', () => {
    render(<PublicHeader currentPath='/categories/pokemon' />);

    expect(screen.getByRole('link', { name: '홈' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: '카테고리' }).getAttribute('href')).toBe('/categories');
    expect(screen.getByRole('link', { name: '인기' }).getAttribute('href')).toBe('/cards');
    expect(screen.queryByRole('link', { name: '검색' })).toBeNull();
    expect(screen.queryByRole('link', { name: '탐색' })).toBeNull();
    expect(screen.queryByRole('link', { name: '세트' })).toBeNull();
    expect(screen.queryByRole('link', { name: '가격 가이드' })).toBeNull();
  });
});
