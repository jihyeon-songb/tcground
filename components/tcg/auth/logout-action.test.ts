import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from './logout-action';

const signOutMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('logout action', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    createClientMock.mockReset();
    redirectMock.mockClear();
    createClientMock.mockResolvedValue({
      auth: {
        signOut: signOutMock,
      },
    });
  });

  it('signs out with Supabase and redirects home', async () => {
    signOutMock.mockResolvedValue({ error: null });

    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/');

    expect(signOutMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('redirects home even when Supabase signOut fails', async () => {
    signOutMock.mockResolvedValue({ error: new Error('failed') });

    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/');

    expect(signOutMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith('/');
  });
});
