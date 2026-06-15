import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HomeSearchForm } from '@/components/tcg/search/HomeSearchForm';
import {
  HeaderAuthActions,
  HeaderAuthActionsFallback,
} from '@/components/tcg/layout/HeaderAuthActions';

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

const NAV_ITEMS = [
  { label: '홈', href: '/' },
  { label: '카테고리', href: '/categories' },
  { label: '인기', href: '/cards' },
] as const;

export function PublicHeader({ currentPath, search = false }: PublicHeaderProps) {
  const activePath = getActivePath(currentPath);

  return (
    <header className='sticky top-0 z-50 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 bg-background px-5 py-4'>
      <div className='flex items-center gap-6 h-[48px]'>
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
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? activePath === '/' : activePath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                className={
                  isActive
                    ? 'border-b-2 border-tcg-red pb-1 font-bold text-foreground'
                    : 'font-normal text-muted-foreground transition-transform duration-200 hover:scale-[1.02] hover:text-tcg-red'
                }
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
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
        <Suspense fallback={<HeaderAuthActionsFallback />}>
          <HeaderAuthActions currentPath={currentPath} />
        </Suspense>
      </div>
    </header>
  );
}

function getActivePath(currentPath: string) {
  if (!currentPath.startsWith('/')) {
    return '/';
  }

  return currentPath.split('?')[0] || '/';
}
