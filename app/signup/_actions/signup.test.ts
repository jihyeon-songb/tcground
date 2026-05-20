import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signup } from './signup';
import type { SignupFormState } from '../_lib/signup-utils';

const signUpMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

const previousState: SignupFormState = {
  fieldErrors: {},
  values: {
    email: '',
  },
};

describe('signup action', () => {
  beforeEach(() => {
    signUpMock.mockReset();
    createClientMock.mockReset();
    headersMock.mockReset();
    createClientMock.mockResolvedValue({
      auth: {
        signUp: signUpMock,
      },
    });
    headersMock.mockResolvedValue(new Headers({ origin: 'https://tcground.test' }));
  });

  it('returns field errors for missing credentials', async () => {
    const result = await signup(previousState, createFormData({}));

    expect(result.fieldErrors.email).toBe('이메일 주소를 입력해 주세요.');
    expect(result.fieldErrors.password).toBe('비밀번호를 입력해 주세요.');
    expect(result.fieldErrors.passwordConfirm).toBe('비밀번호 확인을 입력해 주세요.');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns an email format error', async () => {
    const result = await signup(
      previousState,
      createFormData({
        email: 'invalid-email',
        password: 'password123',
        passwordConfirm: 'password123',
      }),
    );

    expect(result.fieldErrors.email).toBe('올바른 이메일 주소를 입력해 주세요.');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns a password mismatch error', async () => {
    const result = await signup(
      previousState,
      createFormData({
        email: 'user@example.com',
        password: 'password123',
        passwordConfirm: 'password456',
      }),
    );

    expect(result.fieldErrors.passwordConfirm).toBe('비밀번호가 일치하지 않습니다.');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns a Korean message when Supabase rejects signup', async () => {
    signUpMock.mockResolvedValue({
      error: new Error('Password should contain at least one character of each type'),
    });

    const result = await signup(
      previousState,
      createFormData({
        email: 'user@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
      }),
    );

    expect(result.formError).toBe(
      '회원가입을 완료할 수 없습니다. 입력값을 확인한 뒤 다시 시도해 주세요.',
    );
    expect(result.values.email).toBe('user@example.com');
  });

  it('calls Supabase signUp with an auth confirm redirect URL', async () => {
    signUpMock.mockResolvedValue({
      error: null,
    });

    const result = await signup(
      previousState,
      createFormData({
        email: 'user@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        next: '/cards/charizard?tab=prices',
      }),
    );

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
      options: {
        emailRedirectTo:
          'https://tcground.test/auth/confirm?next=%2Fcards%2Fcharizard%3Ftab%3Dprices',
      },
    });
    expect(result.successMessage).toBe(
      '인증 메일을 확인해 주세요. 메일 안의 링크를 누르면 가입이 완료됩니다.',
    );
  });

  it('falls back to home when next is external', async () => {
    signUpMock.mockResolvedValue({
      error: null,
    });

    await signup(
      previousState,
      createFormData({
        email: 'user@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        next: 'https://example.com/account',
      }),
    );

    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          emailRedirectTo: 'https://tcground.test/auth/confirm?next=%2F',
        },
      }),
    );
  });
});

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}
