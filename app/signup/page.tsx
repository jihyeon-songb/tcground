import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthEntryHref, getSafeNextPath } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';
import { SignupForm } from './_components/SignupForm';

export const metadata: Metadata = {
  title: 'TCGround | 회원가입',
  description: 'TCGround 계정을 만들고 관심 카드와 컬렉션 가격을 추적하세요.',
};

interface SignupPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(getFirstParam(resolvedSearchParams.next));
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect(nextPath);
  }

  return (
    <main className='bg-muted flex min-h-screen items-center justify-center px-4 py-12'>
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

        <section className='border-border bg-card rounded-2xl border p-8 shadow-[0_4px_20px_rgba(41,53,71,0.08)]'>
          <header className='mb-6 text-center'>
            <h1 className='text-foreground mb-1 text-2xl leading-tight font-bold'>
              TCGround 시작하기
            </h1>
            <p className='text-muted-foreground text-base leading-[1.5]'>
              이메일 인증 후 컬렉션 가격을 추적할 수 있어요.
            </p>
          </header>

          <SignupForm nextPath={nextPath} />
        </section>

        <p className='text-muted-foreground mt-6 text-center text-base leading-[1.5]'>
          이미 계정이 있으신가요?{' '}
          <Link
            href={getAuthEntryHref('/login', nextPath)}
            className='text-tcg-red font-bold transition-colors hover:underline'
          >
            로그인하기
          </Link>
        </p>
      </div>
    </main>
  );
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
