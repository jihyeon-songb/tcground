'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@tcground/ui';
import { Search, XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HomeSearchFormProps {
  placeholder?: string;
  showSubmitButton?: boolean;
  size?: 'compact' | 'hero' | 'header';
  initialQuery?: string;
  showClearButton?: boolean;
}

export function HomeSearchForm({
  placeholder = '카드 명칭, 세트 또는 캐릭터 검색...',
  showSubmitButton = false,
  size = 'compact',
  initialQuery = '',
  showClearButton = false,
}: HomeSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const trimmedQuery = query.trim();
  const isHero = size === 'hero';
  const isHeader = size === 'header';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedQuery) {
      return;
    }

    router.push(`/categories/pokemon?q=${encodeURIComponent(trimmedQuery)}`);
  }

  const inputBaseClasses =
    'w-full rounded-full border-none text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-tcg-red';
  const inputSizeClasses = isHero
    ? 'bg-card shadow-sm py-5 pr-28 pl-14 text-base leading-[1.6] sm:pr-36 sm:pl-16 sm:text-lg'
    : isHeader
      ? 'bg-border py-3 pr-12 pl-12 text-base leading-[1.5]'
      : 'bg-card shadow-sm py-3 pr-4 pl-12 text-base leading-[1.5]';

  return (
    <form className='relative w-full' aria-label='Card search' onSubmit={handleSubmit} noValidate>
      <Search
        className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
          isHero ? 'left-5 size-6 sm:left-6' : 'left-4 size-5'
        }`}
        aria-hidden='true'
      />
      <input
        className={`${inputBaseClasses} ${inputSizeClasses}`}
        name='q'
        type='search'
        value={query}
        placeholder={placeholder}
        aria-label='카드 명칭, 세트 또는 캐릭터 검색'
        onChange={(event) => setQuery(event.target.value)}
      />
      {showClearButton && trimmedQuery.length > 0 && (
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label='검색어 지우기'
          onClick={() => setQuery('')}
          className='absolute top-1/2 right-3 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-transparent hover:text-tcg-red'
        >
          <XIcon aria-hidden='true' className='h-4 w-4' />
        </Button>
      )}
      <Button
        type='submit'
        size='search'
        className={
          showSubmitButton
            ? 'absolute top-1/2 right-1.5 -translate-y-1/2 sm:right-2'
            : 'sr-only'
        }
      >
        검색
      </Button>
    </form>
  );
}
