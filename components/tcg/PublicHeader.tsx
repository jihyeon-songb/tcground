import Image from 'next/image';
import Link from 'next/link';
import { getAuthEntryHref } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';
import { HomeSearchForm } from './HomeSearchForm';
import { logout } from './logout-action';

type HeaderSearchOptions =
  | {
      initialQuery?: string;
      showClearButton?: boolean;
      desktopOnly?: boolean;
    }
  | false;

interface PublicHeaderProps {
  currentPath: string;
  search?: HeaderSearchOptions;
}

export async function PublicHeader({ currentPath, search = false }: PublicHeaderProps) {
  const isAuthenticated = await getIsAuthenticated();

  return (
    <header className='sticky top-0 z-50 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 bg-[#f8f9fb] px-5 py-4'>
      <div className='flex items-center gap-6'>
        <Link href='/' aria-label='TCGround home'>
          <Image
            src='/logo-transparent.png'
            alt='TCGround Logo'
            width={172}
            height={40}
            className='h-8 w-auto object-contain'
            priority
          />
        </Link>
        <nav className='hidden gap-6 md:flex' aria-label='Primary navigation'>
          <Link className='border-b-2 border-[#bb001a] pb-1 font-bold text-[#191c1e]' href='/'>
            탐색
          </Link>
          <Link
            className='font-normal text-[#535f73] transition-transform duration-200 hover:scale-[1.02] hover:text-[#bb001a]'
            href='/categories'
          >
            세트
          </Link>
          <Link
            className='font-normal text-[#535f73] transition-transform duration-200 hover:scale-[1.02] hover:text-[#bb001a]'
            href='/cards'
          >
            인기
          </Link>
          <Link
            className='font-normal text-[#535f73] transition-transform duration-200 hover:scale-[1.02] hover:text-[#bb001a]'
            href='/search'
          >
            가격 가이드
          </Link>
        </nav>
      </div>

      {search ? (
        <div
          className={`relative mx-4 max-w-xl flex-1 ${search.desktopOnly ? 'hidden md:block' : ''}`}
        >
          <HomeSearchForm
            initialQuery={search.initialQuery}
            showClearButton={search.showClearButton}
            size='header'
          />
        </div>
      ) : null}

      <div className='flex items-center gap-4'>
        {isAuthenticated ? (
          <form action={logout}>
            <button
              type='submit'
              className='rounded-lg bg-[#bb001a] px-6 py-2 text-sm leading-none font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#930012] focus-visible:ring-2 focus-visible:ring-[#bb001a] focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              로그아웃
            </button>
          </form>
        ) : (
          <>
            <Link
              className='hidden font-normal whitespace-nowrap text-[#535f73] hover:text-[#bb001a] md:block'
              href={getAuthEntryHref('/login', currentPath)}
            >
              로그인
            </Link>
            <Link
              className='rounded-lg bg-[#bb001a] px-6 py-2 text-sm leading-none font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#930012]'
              href={getAuthEntryHref('/signup', currentPath)}
            >
              가입하기
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

async function getIsAuthenticated() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    return !error && Boolean(data?.claims);
  } catch {
    return false;
  }
}
