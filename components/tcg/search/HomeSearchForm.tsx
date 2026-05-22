'use client';

import { FormEvent, useState } from 'react';
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
    'w-full rounded-full border-none text-[#191c1e] outline-none placeholder:text-[#535f73] focus:ring-2 focus:ring-[#bb001a]';
  const inputSizeClasses = isHero
    ? 'bg-white shadow-sm py-5 pr-28 pl-14 text-base leading-[1.6] sm:pr-36 sm:pl-16 sm:text-lg'
    : isHeader
      ? 'bg-[#e0e3e5] py-3 pr-12 pl-12 text-base leading-[1.5]'
      : 'bg-white shadow-sm py-3 pr-4 pl-12 text-base leading-[1.5]';

  return (
    <form className='relative w-full' aria-label='Card search' onSubmit={handleSubmit} noValidate>
      <span
        className={`material-symbols-outlined absolute top-1/2 -translate-y-1/2 text-[#535f73] ${
          isHero ? 'left-5 text-2xl sm:left-6' : 'left-4'
        }`}
        aria-hidden='true'
      >
      </span>
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
        <button
          type='button'
          aria-label='검색어 지우기'
          onClick={() => setQuery('')}
          className='absolute top-1/2 right-4 -translate-y-1/2 text-[#535f73] transition-colors hover:text-[#bb001a]'
        >
        </button>
      )}
      <button
        type='submit'
        className={
          showSubmitButton
            ? 'absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full bg-[#bb001a] px-5 py-3 text-sm leading-none font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#930012] focus-visible:ring-2 focus-visible:ring-[#bb001a] focus-visible:ring-offset-2 focus-visible:outline-none sm:right-2 sm:px-8'
            : 'sr-only'
        }
      >
        검색
      </button>
    </form>
  );
}
