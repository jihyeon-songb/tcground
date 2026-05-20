'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getSafeNextPath,
  hasLoginFieldErrors,
  type LoginFormState,
  validateLoginInput,
} from '../_lib/login-utils';

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validationState = validateLoginInput(formData);

  if (hasLoginFieldErrors(validationState)) {
    return validationState;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validationState.values.email,
    password: String(formData.get('password') ?? ''),
  });

  if (error) {
    return {
      fieldErrors: {},
      formError: '이메일 또는 비밀번호가 올바르지 않습니다.',
      values: validationState.values,
    };
  }

  redirect(getSafeNextPath(formData.get('next')));
}
