import { describe, expect, it } from 'vitest';
import { hasSignupFieldErrors, validateSignupInput } from './signup-utils';

describe('validateSignupInput', () => {
  it('returns field errors for missing values', () => {
    const result = validateSignupInput(createFormData({}));

    expect(result.fieldErrors.email).toBe('이메일 주소를 입력해 주세요.');
    expect(result.fieldErrors.password).toBe('비밀번호를 입력해 주세요.');
    expect(result.fieldErrors.passwordConfirm).toBe('비밀번호 확인을 입력해 주세요.');
    expect(hasSignupFieldErrors(result)).toBe(true);
  });

  it('returns an email format error', () => {
    const result = validateSignupInput(
      createFormData({
        email: 'invalid-email',
        password: 'password123',
        passwordConfirm: 'password123',
      }),
    );

    expect(result.fieldErrors.email).toBe('올바른 이메일 주소를 입력해 주세요.');
  });

  it('requires at least 8 password characters', () => {
    const result = validateSignupInput(
      createFormData({
        email: 'user@example.com',
        password: 'short',
        passwordConfirm: 'short',
      }),
    );

    expect(result.fieldErrors.password).toBe('비밀번호는 8자 이상이어야 합니다.');
  });

  it('returns a password confirmation mismatch error', () => {
    const result = validateSignupInput(
      createFormData({
        email: 'user@example.com',
        password: 'password123',
        passwordConfirm: 'password456',
      }),
    );

    expect(result.fieldErrors.passwordConfirm).toBe('비밀번호가 일치하지 않습니다.');
  });
});

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}
