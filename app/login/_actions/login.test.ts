import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from './login';
import type { LoginFormState } from '../_lib/login-utils';

const signInWithPasswordMock = vi.hoisted(() => vi.fn());
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

const previousState: LoginFormState = {
  fieldErrors: {},
  values: {
    email: '',
  },
};

describe('login action', () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset();
    createClientMock.mockReset();
    redirectMock.mockClear();
    createClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: signInWithPasswordMock,
      },
    });
  });

  it('returns field errors for missing credentials', async () => {
    const result = await login(previousState, createFormData({}));

    expect(result.fieldErrors.email).toBe('이메일 주소를 입력해 주세요.');
    expect(result.fieldErrors.password).toBe('비밀번호를 입력해 주세요.');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns an email format error', async () => {
    const result = await login(
      previousState,
      createFormData({
        email: 'invalid-email',
        password: 'password123',
      }),
    );

    expect(result.fieldErrors.email).toBe('올바른 이메일 주소를 입력해 주세요.');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns a Korean message when Supabase rejects the credentials', async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: new Error('Invalid login credentials'),
    });

    const result = await login(
      previousState,
      createFormData({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    );

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'wrong-password',
    });
    expect(result.formError).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
    expect(result.values.email).toBe('user@example.com');
  });

  it('redirects to a safe internal next path on successful login', async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: null,
    });

    await expect(
      login(
        previousState,
        createFormData({
          email: 'user@example.com',
          password: 'password123',
          next: '/search?q=Charizard',
        }),
      ),
    ).rejects.toThrow('NEXT_REDIRECT:/search?q=Charizard');

    expect(redirectMock).toHaveBeenCalledWith('/search?q=Charizard');
  });

  it('falls back to home when next is external', async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: null,
    });

    await expect(
      login(
        previousState,
        createFormData({
          email: 'user@example.com',
          password: 'password123',
          next: 'https://example.com/account',
        }),
      ),
    ).rejects.toThrow('NEXT_REDIRECT:/');

    expect(redirectMock).toHaveBeenCalledWith('/');
  });
});

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}
