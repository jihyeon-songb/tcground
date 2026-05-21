import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { tcgCategories } from '@/lib/tcg-data';
import { CategoryOverviewList } from './page';

describe('CategoryOverviewList', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders top-level TCG category links', () => {
    render(<CategoryOverviewList categories={tcgCategories} />);

    expect(screen.getByRole('link', { name: /포켓몬/ }).getAttribute('href')).toBe(
      '/categories/pokemon',
    );
    expect(screen.getByRole('link', { name: /매직 더 개더링/ }).getAttribute('href')).toBe(
      '/categories/magic',
    );
    expect(screen.getByRole('link', { name: /유희왕/ }).getAttribute('href')).toBe(
      '/categories/yugioh',
    );
    expect(screen.getByRole('link', { name: /원피스/ }).getAttribute('href')).toBe(
      '/categories/one-piece',
    );
  });
});
