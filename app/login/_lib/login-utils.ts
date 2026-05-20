export { getSafeNextPath } from '@/lib/auth/redirect';

export interface LoginFormState {
  fieldErrors: {
    email?: string;
    password?: string;
  };
  formError?: string;
  values: {
    email: string;
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(formData: FormData): LoginFormState {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const fieldErrors: LoginFormState['fieldErrors'] = {};

  if (!email) {
    fieldErrors.email = '이메일 주소를 입력해 주세요.';
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = '올바른 이메일 주소를 입력해 주세요.';
  }

  if (!password) {
    fieldErrors.password = '비밀번호를 입력해 주세요.';
  }

  return {
    fieldErrors,
    values: {
      email,
    },
  };
}

export function hasLoginFieldErrors(state: LoginFormState) {
  return Boolean(state.fieldErrors.email || state.fieldErrors.password);
}
