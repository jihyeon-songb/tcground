import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@tcground/ui';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/tcg/auth/LoginForm';
import { getAuthEntryHref } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';
import { getSafeNextPath } from './_lib/login-utils';

export const metadata: Metadata = {
  title: 'TCGround | 로그인',
  description: 'TCGround 계정으로 로그인하여 컬렉션 가격을 추적하세요.',
};

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(getFirstParam(resolvedSearchParams.next));
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect(nextPath);
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-muted px-4 py-12'>
      <div className='w-full max-w-md'>
        <div className='mb-8 flex justify-center'>
          <Link href='/' aria-label='TCGround home'>
            <Image
              src='/logo-transparent.png'
              alt='TCGround'
              width={172}
              height={48}
              priority
              className='h-12 w-auto object-contain'
            />
          </Link>
        </div>

        <section className='rounded-2xl border border-border bg-card p-8 shadow-[0_4px_20px_rgba(41,53,71,0.08)]'>
          <header className='mb-6 text-center'>
            <h1 className='mb-1 text-2xl leading-tight font-bold text-foreground'>
              다시 오신 걸 환영해요
            </h1>
            <p className='text-base leading-[1.5] text-muted-foreground'>
              컬렉션 가격을 추적하려면 로그인하세요.
            </p>
          </header>

          <LoginForm nextPath={nextPath} />

          <div className='my-6 flex items-center gap-3'>
            <span className='h-px flex-1 bg-border' aria-hidden='true' />
            <span className='text-xs font-medium text-muted-foreground'>또는 다음으로 계속</span>
            <span className='h-px flex-1 bg-border' aria-hidden='true' />
          </div>

          <Button
            type='button'
            variant='outline'
            size='auth'
          >
            <GoogleIcon className='h-4 w-4' />
            Google로 계속하기
          </Button>
        </section>

        <p className='mt-6 text-center text-base leading-[1.5] text-muted-foreground'>
          TCGround이 처음이세요?{' '}
          <Link
            href={getAuthEntryHref('/signup', nextPath)}
            className='font-bold text-tcg-red transition-colors hover:underline'
          >
            TCGround 가입하기
          </Link>
        </p>
      </div>
    </main>
  );
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' aria-hidden='true'>
      <path
        fill='#4285F4'
        d='M21.6 12.227c0-.747-.067-1.467-.193-2.16H12v4.087h5.387a4.601 4.601 0 0 1-1.997 3.02v2.508h3.227c1.887-1.74 2.983-4.293 2.983-7.455z'
      />
      <path
        fill='#34A853'
        d='M12 22c2.7 0 4.967-.893 6.62-2.418l-3.227-2.507c-.893.6-2.04.953-3.393.953-2.607 0-4.813-1.76-5.6-4.123H3.067v2.587A9.997 9.997 0 0 0 12 22z'
      />
      <path
        fill='#FBBC05'
        d='M6.4 13.905A6 6 0 0 1 6.087 12c0-.66.113-1.3.313-1.905V7.508H3.067A10.005 10.005 0 0 0 2 12c0 1.613.387 3.14 1.067 4.492l3.333-2.587z'
      />
      <path
        fill='#EA4335'
        d='M12 5.973c1.467 0 2.787.507 3.827 1.5l2.867-2.867C16.96 3.013 14.7 2 12 2A9.997 9.997 0 0 0 3.067 7.508l3.333 2.587C7.187 7.733 9.393 5.973 12 5.973z'
      />
    </svg>
  );
}
