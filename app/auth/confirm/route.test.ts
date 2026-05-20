import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const verifyOtpMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

describe('/auth/confirm route', () => {
  beforeEach(() => {
    verifyOtpMock.mockReset();
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({
      auth: {
        verifyOtp: verifyOtpMock,
      },
    });
  });

  it('verifies the token hash and redirects to a safe next path', async () => {
    verifyOtpMock.mockResolvedValue({
      error: null,
    });

    const response = await GET(
      createRequest(
        'https://tcground.test/auth/confirm?token_hash=abc123&type=email&next=/search?q=Charizard',
      ),
    );

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: 'abc123',
      type: 'email',
    });
    expect(response.headers.get('location')).toBe('https://tcground.test/search?q=Charizard');
  });

  it('falls back to home when next is unsafe', async () => {
    verifyOtpMock.mockResolvedValue({
      error: null,
    });

    const response = await GET(
      createRequest(
        'https://tcground.test/auth/confirm?token_hash=abc123&type=email&next=https://example.com',
      ),
    );

    expect(response.headers.get('location')).toBe('https://tcground.test/');
  });

  it('redirects to login when verification fails', async () => {
    verifyOtpMock.mockResolvedValue({
      error: new Error('Token has expired or is invalid'),
    });

    const response = await GET(
      createRequest('https://tcground.test/auth/confirm?token_hash=abc123&type=email'),
    );

    expect(response.headers.get('location')).toBe('https://tcground.test/login');
  });

  it('redirects to login when required params are missing', async () => {
    const response = await GET(createRequest('https://tcground.test/auth/confirm'));

    expect(createClientMock).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('https://tcground.test/login');
  });
});

function createRequest(url: string) {
  return new NextRequest(url);
}
