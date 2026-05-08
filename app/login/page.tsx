import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'TCGround | 로그인',
  description: 'TCGround 계정으로 로그인하여 컬렉션 가격을 추적하세요.',
};

export default function LoginPage() {
  return (
    <main className='flex min-h-screen items-center justify-center bg-[#f2f4f6] px-4 py-12'>
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

        <section className='rounded-2xl border border-[#e0e3e5] bg-white p-8 shadow-[0_4px_20px_rgba(41,53,71,0.08)]'>
          <header className='mb-6 text-center'>
            <h1 className='mb-1 text-2xl leading-tight font-bold text-[#191c1e]'>
              다시 오신 걸 환영해요
            </h1>
            <p className='text-base leading-[1.5] text-[#535f73]'>
              컬렉션 가격을 추적하려면 로그인하세요.
            </p>
          </header>

          <form className='space-y-4'>
            <div className='space-y-1.5'>
              <label htmlFor='email' className='block text-sm font-bold text-[#191c1e]'>
                이메일 주소
              </label>
              <div className='relative'>
                <span
                  className='material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] leading-none text-[#535f73]'
                  aria-hidden='true'
                >
                </span>
                <input
                  id='email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  required
                  placeholder='name@example.com'
                  className='block h-11 w-full rounded-lg border border-[#e0e3e5] bg-white pr-3 pl-10 text-base text-[#191c1e] placeholder:text-[#535f73] transition-colors focus:border-[#bb001a] focus:ring-2 focus:ring-[#bb001a]/20 focus:outline-none'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
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
                <span
                  className='material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] leading-none text-[#535f73]'
                  aria-hidden='true'
                >
                </span>
                <input
                  id='password'
                  name='password'
                  type='password'
                  autoComplete='current-password'
                  required
                  placeholder='••••••••'
                  className='block h-11 w-full rounded-lg border border-[#e0e3e5] bg-white pr-3 pl-10 text-base text-[#191c1e] placeholder:text-[#535f73] transition-colors focus:border-[#bb001a] focus:ring-2 focus:ring-[#bb001a]/20 focus:outline-none'
                />
              </div>
            </div>

            <button
              type='submit'
              className='mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#bb001a] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#930012] focus-visible:ring-2 focus-visible:ring-[#bb001a] focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              로그인
            </button>
          </form>

          <div className='my-6 flex items-center gap-3'>
            <span className='h-px flex-1 bg-[#e0e3e5]' aria-hidden='true' />
            <span className='text-xs font-medium text-[#535f73]'>또는 다음으로 계속</span>
            <span className='h-px flex-1 bg-[#e0e3e5]' aria-hidden='true' />
          </div>

          <button
            type='button'
            className='inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e0e3e5] bg-white text-base font-semibold text-[#191c1e] transition-colors hover:bg-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#bb001a] focus-visible:ring-offset-2 focus-visible:outline-none'
          >
            <GoogleIcon className='h-4 w-4' />
            Google로 계속하기
          </button>
        </section>

        <p className='mt-6 text-center text-base leading-[1.5] text-[#535f73]'>
          TCGround이 처음이세요?{' '}
          <Link
            href='/signup'
            className='font-bold text-[#bb001a] transition-colors hover:underline'
          >
            TCGround 가입하기
          </Link>
        </p>
      </div>
    </main>
  );
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
