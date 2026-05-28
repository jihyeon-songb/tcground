'use client';

import Link from 'next/link';
import { Button } from '@tcground/ui';
import { CheckCircle2, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import { useActionState } from 'react';
import { signup } from '@/app/signup/_actions/signup';
import type { SignupFormState } from '@/app/signup/_lib/signup-utils';
import { getAuthEntryHref } from '@/lib/auth/redirect';

interface SignupFormProps {
  nextPath: string;
}

const initialState: SignupFormState = {
  fieldErrors: {},
  values: {
    email: '',
  },
};

export function SignupForm({ nextPath }: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(signup, initialState);
  const loginHref = getAuthEntryHref('/login', nextPath);

  return (
    <form action={formAction} className='space-y-4' noValidate>
      <input type='hidden' name='next' value={nextPath} />

      {state.formError ? (
        <p
          role='alert'
          className='rounded-lg border border-[#f2b8c0] bg-[#fff4f5] px-3 py-2 text-sm font-medium text-[#930012]'
        >
          {state.formError}
        </p>
      ) : null}

      {state.successMessage ? (
        <div
          role='status'
          className='space-y-2 rounded-lg border border-[#b7e4c7] bg-[#f0fff4] px-3 py-3 text-sm text-[#14532d]'
        >
          <div className='flex items-start gap-2 font-semibold'>
            <CheckCircle2 aria-hidden='true' className='mt-0.5 h-4 w-4 shrink-0' />
            <p>{state.successMessage}</p>
          </div>
          <Link href={loginHref} className='inline-flex font-bold text-[#0079b6] hover:underline'>
            로그인 화면으로 이동
          </Link>
        </div>
      ) : null}

      <div className='space-y-1.5'>
        <label htmlFor='email' className='block text-sm font-bold text-[#191c1e]'>
          이메일 주소
        </label>
        <div className='relative'>
          <Mail
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-[#535f73]'
          />
          <input
            id='email'
            name='email'
            type='email'
            autoComplete='email'
            required
            placeholder='name@example.com'
            defaultValue={state.values.email}
            aria-invalid={Boolean(state.fieldErrors.email)}
            aria-describedby={state.fieldErrors.email ? 'email-error' : undefined}
            disabled={isPending}
            className='block h-11 w-full rounded-lg border border-[#e0e3e5] bg-white pr-3 pl-10 text-base text-[#191c1e] transition-colors placeholder:text-[#535f73] focus:border-[#bb001a] focus:ring-2 focus:ring-[#bb001a]/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f2f4f6]'
          />
        </div>
        {state.fieldErrors.email ? (
          <p id='email-error' className='text-sm font-medium text-[#930012]'>
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <label htmlFor='password' className='block text-sm font-bold text-[#191c1e]'>
          비밀번호
        </label>
        <div className='relative'>
          <LockKeyhole
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-[#535f73]'
          />
          <input
            id='password'
            name='password'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            placeholder='8자 이상'
            aria-invalid={Boolean(state.fieldErrors.password)}
            aria-describedby={state.fieldErrors.password ? 'password-error' : undefined}
            disabled={isPending}
            className='block h-11 w-full rounded-lg border border-[#e0e3e5] bg-white pr-3 pl-10 text-base text-[#191c1e] transition-colors placeholder:text-[#535f73] focus:border-[#bb001a] focus:ring-2 focus:ring-[#bb001a]/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f2f4f6]'
          />
        </div>
        {state.fieldErrors.password ? (
          <p id='password-error' className='text-sm font-medium text-[#930012]'>
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <label htmlFor='passwordConfirm' className='block text-sm font-bold text-[#191c1e]'>
          비밀번호 확인
        </label>
        <div className='relative'>
          <LockKeyhole
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-[#535f73]'
          />
          <input
            id='passwordConfirm'
            name='passwordConfirm'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            placeholder='비밀번호 다시 입력'
            aria-invalid={Boolean(state.fieldErrors.passwordConfirm)}
            aria-describedby={
              state.fieldErrors.passwordConfirm ? 'password-confirm-error' : undefined
            }
            disabled={isPending}
            className='block h-11 w-full rounded-lg border border-[#e0e3e5] bg-white pr-3 pl-10 text-base text-[#191c1e] transition-colors placeholder:text-[#535f73] focus:border-[#bb001a] focus:ring-2 focus:ring-[#bb001a]/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f2f4f6]'
          />
        </div>
        {state.fieldErrors.passwordConfirm ? (
          <p id='password-confirm-error' className='text-sm font-medium text-[#930012]'>
            {state.fieldErrors.passwordConfirm}
          </p>
        ) : null}
      </div>

      <Button
        type='submit'
        disabled={isPending}
        size='auth'
        className='mt-6'
      >
        <UserPlus aria-hidden='true' className='h-4 w-4' />
        {isPending ? '가입 요청 중...' : '회원가입'}
      </Button>
    </form>
  );
}
