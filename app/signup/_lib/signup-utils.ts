export interface SignupFormState {
  fieldErrors: {
    email?: string;
    password?: string;
    passwordConfirm?: string;
  };
  formError?: string;
  successMessage?: string;
  values: {
    email: string;
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateSignupInput(formData: FormData): SignupFormState {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('passwordConfirm') ?? '');

  const fieldErrors: SignupFormState['fieldErrors'] = {};

  if (!email) {
    fieldErrors.email = '이메일 주소를 입력해 주세요.';
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = '올바른 이메일 주소를 입력해 주세요.';
  }

  if (!password) {
    fieldErrors.password = '비밀번호를 입력해 주세요.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = '비밀번호는 8자 이상이어야 합니다.';
  }

  if (!passwordConfirm) {
    fieldErrors.passwordConfirm = '비밀번호 확인을 입력해 주세요.';
  } else if (password && password !== passwordConfirm) {
    fieldErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
  }

  return {
    fieldErrors,
    values: {
      email,
    },
  };
}

export function hasSignupFieldErrors(state: SignupFormState) {
  return Boolean(
    state.fieldErrors.email || state.fieldErrors.password || state.fieldErrors.passwordConfirm,
  );
}
