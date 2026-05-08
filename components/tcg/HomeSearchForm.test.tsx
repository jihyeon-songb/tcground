import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeSearchForm } from './HomeSearchForm';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('HomeSearchForm', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    pushMock.mockClear();
  });

  it('prevents empty searches', () => {
    render(<HomeSearchForm />);

    fireEvent.submit(screen.getByRole('form', { name: 'Card search' }));

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('navigates to search results with an encoded query', () => {
    render(<HomeSearchForm />);

    fireEvent.change(screen.getByLabelText('카드 명칭, 세트 또는 캐릭터 검색'), {
      target: { value: 'Black Lotus' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Card search' }));

    expect(pushMock).toHaveBeenCalledWith('/search?q=Black%20Lotus');
  });

  it('can render a visible search button for the hero search', () => {
    render(<HomeSearchForm showSubmitButton size='hero' />);

    expect(screen.getByRole('button', { name: '검색' })).toBeTruthy();
  });
});
