import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardRating } from './CardRating';

const submitCardRatingMock = vi.hoisted(() => vi.fn());

vi.mock('../_actions/rate-card', () => ({
  submitCardRating: submitCardRatingMock,
}));

const baseProps = {
  cardId: 'card-1',
  slug: 'charizard-ex',
  summary: { average: 4.2, count: 12 },
  viewerRating: null,
  isAuthenticated: true,
};

describe('CardRating', () => {
  beforeEach(() => {
    submitCardRatingMock.mockReset();
    submitCardRatingMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the empty state when no one has rated yet', () => {
    render(<CardRating {...baseProps} summary={{ average: null, count: 0 }} />);

    expect(screen.getByText('평가 없음')).toBeTruthy();
    expect(screen.getByText('아직 평가가 없습니다')).toBeTruthy();
  });

  it('submits the chosen score for a signed-in user', async () => {
    render(<CardRating {...baseProps} />);

    fireEvent.click(screen.getByRole('radio', { name: '4점' }));

    await waitFor(() => {
      expect(submitCardRatingMock).toHaveBeenCalledWith({
        cardId: 'card-1',
        slug: 'charizard-ex',
        score: 4,
      });
    });
  });

  it('surfaces the server error and reverts the selection on failure', async () => {
    submitCardRatingMock.mockResolvedValue({ ok: false, error: '저장 실패' });

    render(<CardRating {...baseProps} viewerRating={2} />);

    fireEvent.click(screen.getByRole('radio', { name: '5점' }));

    expect((await screen.findByRole('alert')).textContent).toBe('저장 실패');
    expect(screen.getByRole('radio', { name: '2점' }).getAttribute('aria-checked')).toBe('true');
  });
});
