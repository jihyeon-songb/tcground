'use server';

import { headers } from 'next/headers';
import { getAuthConfirmRedirectUrl, getSafeNextPath } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';
import {
  hasSignupFieldErrors,
  type SignupFormState,
  validateSignupInput,
} from '../_lib/signup-utils';

export async function signup(
  _previousState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const validationState = validateSignupInput(formData);

  if (hasSignupFieldErrors(validationState)) {
    return validationState;
  }

  const nextPath = getSafeNextPath(formData.get('next'));
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: validationState.values.email,
    password: String(formData.get('password') ?? ''),
    options: {
      emailRedirectTo: getAuthConfirmRedirectUrl(await getRequestOrigin(), nextPath),
    },
  });

  if (error) {
    return {
      fieldErrors: {},
      formError: '회원가입을 완료할 수 없습니다. 입력값을 확인한 뒤 다시 시도해 주세요.',
      values: validationState.values,
    };
  }

  return {
    fieldErrors: {},
    successMessage: '인증 메일을 확인해 주세요. 메일 안의 링크를 누르면 가입이 완료됩니다.',
    values: validationState.values,
  };
}

async function getRequestOrigin() {
  const headersList = await headers();
  const origin = headersList.get('origin');

  if (origin) {
    return origin;
  }

  const host = headersList.get('host');

  if (host) {
    const protocol = headersList.get('x-forwarded-proto') ?? 'https';
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}
