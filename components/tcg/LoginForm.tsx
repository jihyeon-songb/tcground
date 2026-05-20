'use client';

import Link from 'next/link';
import { LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useActionState } from 'react';
import { login } from '@/app/login/_actions/login';
import type { LoginFormState } from '@/app/login/_lib/login-utils';

interface LoginFormProps {
  nextPath: string;
}

const initialState: LoginFormState = {
  fieldErrors: {},
  values: {
    email: '',
  },
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(login, initialState);

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
        <div className='flex items-center justify-between gap-3'>
          <label htmlFor='password' className='block text-sm font-bold text-[#191c1e]'>
            비밀번호
          </label>
          <Link
            href='/forgot-password'
            className='text-xs font-medium text-[#0079b6] transition-colors hover:underline'
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>
        <div className='relative'>
          <LockKeyhole
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-[#535f73]'
          />
          <input
            id='password'
            name='password'
            type='password'
            autoComplete='current-password'
            required
            placeholder='비밀번호'
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

      <button
        type='submit'
        disabled={isPending}
        className='mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#bb001a] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#930012] focus-visible:ring-2 focus-visible:ring-[#bb001a] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#a6adb7]'
      >
        <LogIn aria-hidden='true' className='h-4 w-4' />
        {isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}
