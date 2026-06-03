'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@tcground/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { PokemonSort } from '@/lib/tcg-catalog';
import type { CardView } from './CardResults';

interface CategoryResultsToolbarProps {
  totalCount: number;
  sort: PokemonSort;
  view: CardView;
}

const SORT_OPTIONS: { value: PokemonSort; label: string }[] = [
  { value: 'best', label: '추천순' },
  { value: 'name-asc', label: '이름 A→Z' },
  { value: 'name-desc', label: '이름 Z→A' },
];

const SORT_LABELS: Record<PokemonSort, string> = {
  best: '추천순',
  'name-asc': '이름 A→Z',
  'name-desc': '이름 Z→A',
};

export function CategoryResultsToolbar({ totalCount, sort, view }: CategoryResultsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const changeSort = useCallback(
    (value: PokemonSort) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (value === 'best') {
        params.delete('sort');
      } else {
        params.set('sort', value);
      }
      // Re-sorting invalidates the current page position.
      params.delete('page');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const changeView = useCallback(
    (value: CardView) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (value === 'grid') {
        params.delete('view');
      } else {
        params.set('view', value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className='mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#e0e3e5] pb-4'>
      <p aria-live='polite' className='text-base font-bold text-[#191c1e]'>
        포켓몬 <span className='tabular-nums'>{totalCount.toLocaleString('ko-KR')}</span>개 결과
      </p>

      <div className='flex items-center gap-3'>
        <span className='text-sm font-semibold text-[#535f73]'>정렬</span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type='button'
              className='inline-flex min-w-36 items-center justify-between gap-2 rounded-lg border border-[#cdd2d6] bg-white px-4 py-2 text-sm font-semibold text-[#191c1e] transition-colors hover:border-[#191c1e]'
            >
              {SORT_LABELS[sort]}
              <span aria-hidden className='text-[#535f73]'>
                ▾
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align='end' className='w-44'>
            <div className='flex flex-col'>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type='button'
                  aria-pressed={option.value === sort}
                  onClick={() => changeSort(option.value)}
                  className={`rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[#f2f4f6] ${
                    option.value === sort ? 'font-bold text-[#bb001a]' : 'text-[#191c1e]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div
          role='group'
          aria-label='보기 방식'
          className='hidden items-center gap-1 rounded-lg border border-[#cdd2d6] bg-white p-1 sm:flex'
        >
          <button
            type='button'
            aria-pressed={view === 'grid'}
            onClick={() => changeView('grid')}
            className={`rounded-md px-2 py-1 text-xs font-bold transition-colors ${
              view === 'grid' ? 'bg-[#bb001a] text-white' : 'text-[#535f73] hover:bg-[#f2f4f6]'
            }`}
          >
            격자
          </button>
          <button
            type='button'
            aria-pressed={view === 'list'}
            onClick={() => changeView('list')}
            className={`rounded-md px-2 py-1 text-xs font-bold transition-colors ${
              view === 'list' ? 'bg-[#bb001a] text-white' : 'text-[#535f73] hover:bg-[#f2f4f6]'
            }`}
          >
            목록
          </button>
        </div>
      </div>
    </div>
  );
}
