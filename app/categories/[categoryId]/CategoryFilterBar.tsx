'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@tcground/ui';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { AvailableSetOption } from '@/lib/tcg-catalog';

type FilterKey = 'rarity' | 'set';

interface CategoryFilterBarProps {
  availableRarities: readonly string[];
  availableSets: readonly AvailableSetOption[];
  selectedRarities: readonly string[];
  selectedSetSlugs: readonly string[];
}

export function CategoryFilterBar({
  availableRarities,
  availableSets,
  selectedRarities,
  selectedSetSlugs,
}: CategoryFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggleParam = useCallback(
    (key: FilterKey, value: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      const current = (params.get(key) ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

      const next = checked
        ? Array.from(new Set([...current, value]))
        : current.filter((entry) => entry !== value);

      if (next.length === 0) {
        params.delete(key);
      } else {
        params.set(key, next.join(','));
      }

      // A filter change invalidates the current page position.
      params.delete('page');

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('rarity');
    params.delete('set');
    params.delete('page');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const raritySet = new Set(selectedRarities);
  const setSlugSet = new Set(selectedSetSlugs);
  const activeCount = selectedRarities.length + selectedSetSlugs.length;

  return (
    <div className='mb-6 flex flex-wrap items-center gap-2'>
      <span className='inline-flex items-center gap-2 rounded-lg border border-[#191c1e] bg-white px-4 py-2 text-sm font-bold text-[#191c1e]'>
        모든 필터
        {activeCount > 0 ? (
          <span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#bb001a] px-1.5 text-xs font-bold text-white'>
            {activeCount}
          </span>
        ) : null}
      </span>

      <CategoryChip aria-label='포켓몬 카테고리 (선택됨)'>
        포켓몬
        <Link
          href='/categories'
          aria-label='포켓몬 카테고리 해제'
          className='ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[#0079b6] transition-colors hover:bg-[#dcefff]'
        >
          ✕
        </Link>
      </CategoryChip>

      <FilterDropdown label='세트' selectedCount={selectedSetSlugs.length}>
        {availableSets.length === 0 ? (
          <p className='px-1 text-sm text-[#535f73]'>등록된 세트가 없습니다.</p>
        ) : (
          availableSets.map((set) => (
            <FilterCheckbox
              key={set.slug}
              id={`filter-set-${set.slug}`}
              label={set.name}
              checked={setSlugSet.has(set.slug)}
              onChange={(checked) => toggleParam('set', set.slug, checked)}
            />
          ))
        )}
      </FilterDropdown>

      <FilterDropdown label='레어도' selectedCount={selectedRarities.length}>
        {availableRarities.length === 0 ? (
          <p className='px-1 text-sm text-[#535f73]'>등록된 레어도가 없습니다.</p>
        ) : (
          availableRarities.map((rarity) => (
            <FilterCheckbox
              key={rarity}
              id={`filter-rarity-${rarity}`}
              label={rarity}
              checked={raritySet.has(rarity)}
              onChange={(checked) => toggleParam('rarity', rarity, checked)}
            />
          ))
        )}
      </FilterDropdown>

      {activeCount > 0 ? (
        <button
          type='button'
          onClick={clearFilters}
          className='ml-1 text-sm font-bold text-[#191c1e] transition-colors hover:text-[#bb001a]'
        >
          필터 초기화
        </button>
      ) : null}
    </div>
  );
}

function CategoryChip({
  children,
  ...props
}: { children: React.ReactNode } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className='inline-flex items-center gap-1 rounded-lg border border-[#0079b6] bg-[#eef7ff] px-4 py-2 text-sm font-bold text-[#0079b6]'
      {...props}
    >
      {children}
    </span>
  );
}

function FilterDropdown({
  label,
  selectedCount,
  children,
}: {
  label: string;
  selectedCount: number;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='inline-flex items-center gap-2 rounded-lg border border-[#cdd2d6] bg-white px-4 py-2 text-sm font-semibold text-[#191c1e] transition-colors hover:border-[#191c1e] data-[state=open]:border-[#bb001a]'
        >
          {label}
          {selectedCount > 0 ? (
            <span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#bb001a] px-1.5 text-xs font-bold text-white'>
              {selectedCount}
            </span>
          ) : null}
          <span aria-hidden className='text-[#535f73]'>
            ▾
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' className='max-h-80 w-64 overflow-y-auto'>
        <div className='flex flex-col gap-3'>{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function FilterCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className='group flex cursor-pointer items-center gap-3'>
      <input
        id={id}
        type='checkbox'
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className='h-5 w-5 rounded border-[#535f73] text-[#bb001a] focus:ring-[#bb001a]'
      />
      <span className='text-base text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
        {label}
      </span>
    </label>
  );
}
