import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitCardRating } from './rate-card';

const createClientMock = vi.hoisted(() => vi.fn());
const getClaimsMock = vi.hoisted(() => vi.fn());
const upsertMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

const input = { cardId: 'card-1', slug: 'charizard-ex', score: 4 };

describe('submitCardRating', () => {
  beforeEach(() => {
    getClaimsMock.mockReset();
    upsertMock.mockReset();
    fromMock.mockReset();
    revalidatePathMock.mockClear();
    createClientMock.mockReset();

    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });
    createClientMock.mockResolvedValue({
      auth: { getClaims: getClaimsMock },
      from: fromMock,
    });
  });

  it('rejects an out-of-range score before touching Supabase', async () => {
    const result = await submitCardRating({ ...input, score: 6 });

    expect(result).toEqual({ ok: false, error: '평점은 1점에서 5점 사이여야 합니다.' });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rejects when the user is not signed in', async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: null } });

    const result = await submitCardRating(input);

    expect(result).toEqual({ ok: false, error: '평점을 남기려면 로그인이 필요합니다.' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('upserts the rating for the signed-in user and revalidates the page', async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: 'user-9' } } });

    const result = await submitCardRating(input);

    expect(result).toEqual({ ok: true });
    expect(fromMock).toHaveBeenCalledWith('card_ratings');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-9', card_id: 'card-1', score: 4 }),
      { onConflict: 'user_id,card_id' },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/cards/charizard-ex');
  });

  it('returns an error and skips revalidation when the upsert fails', async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: 'user-9' } } });
    upsertMock.mockResolvedValue({ error: new Error('db down') });

    const result = await submitCardRating(input);

    expect(result.ok).toBe(false);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
