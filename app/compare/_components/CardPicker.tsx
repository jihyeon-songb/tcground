'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@tcground/ui';
import { loadPokemonCards } from '@/app/categories/[categoryId]/_actions/load-cards';
import type { PokemonCatalogCard } from '@/lib/tcg-catalog';

interface CardPickerProps {
  slot: 'left' | 'right';
}

export function CardPicker({ slot }: CardPickerProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PokemonCatalogCard[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 1) return;
    startTransition(async () => {
      const res = await loadPokemonCards({ query: q, rarities: [], setSlugs: [], sort: 'name-asc', page: 1 });
      setResults(res.cards);
      setSearched(true);
    });
  }

  function pick(slug: string) {
    const next = new URLSearchParams(params.toString());
    next.set(slot, slug);
    router.replace(`/compare?${next.toString()}`);
  }

  return (
    <div className='flex h-full flex-col rounded-2xl border border-dashed border-muted bg-card p-5'>
      <p className='mb-3 text-sm font-semibold text-foreground'>
        {slot === 'left' ? '왼쪽' : '오른쪽'} 카드 선택
      </p>
      <form onSubmit={handleSearch} className='flex gap-2'>
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='카드 이름 검색'
          className='min-w-0 flex-1 rounded-lg border border-muted bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-tcg-red'
          aria-label='카드 이름 검색'
        />
        <Button type='submit' variant='outline' disabled={isPending}>
          {isPending ? '검색 중…' : '검색'}
        </Button>
      </form>

      <ul className='mt-4 flex-1 space-y-2 overflow-y-auto'>
        {results.map((card) => (
          <li key={card.slug}>
            <button
              type='button'
              onClick={() => pick(card.slug)}
              className='flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted'
            >
              {card.imageUrl ? (
                <Image src={card.imageUrl} alt='' width={36} height={50} className='rounded' />
              ) : (
                <span className='h-[50px] w-9 rounded bg-muted' aria-hidden />
              )}
              <span className='min-w-0'>
                <span className='block truncate text-sm font-medium text-foreground'>{card.name}</span>
                <span className='block truncate text-xs text-muted-foreground'>{card.setName}</span>
              </span>
            </button>
          </li>
        ))}
        {searched && !isPending && results.length === 0 && (
          <li className='py-6 text-center text-sm text-muted-foreground'>검색 결과가 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
