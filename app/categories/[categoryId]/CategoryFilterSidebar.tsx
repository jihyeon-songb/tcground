'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { AvailableSetOption } from '@/lib/tcg-catalog';

type FilterKey = 'rarity' | 'set';

interface CategoryFilterSidebarProps {
  availableRarities: readonly string[];
  availableSets: readonly AvailableSetOption[];
  selectedRarities: readonly string[];
  selectedSetSlugs: readonly string[];
}

export function CategoryFilterSidebar({
  availableRarities,
  availableSets,
  selectedRarities,
  selectedSetSlugs,
}: CategoryFilterSidebarProps) {
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

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const raritySet = new Set(selectedRarities);
  const setSlugSet = new Set(selectedSetSlugs);

  return (
    <aside className='flex w-full shrink-0 flex-col gap-6 lg:w-64'>
      <FilterCard title='레어도'>
        <div className='flex flex-col gap-3'>
          {availableRarities.length === 0 ? (
            <p className='text-sm leading-[1.5] text-[#535f73]'>등록된 레어도가 없습니다.</p>
          ) : (
            availableRarities.map((rarity) => (
              <label
                key={rarity}
                className='group flex cursor-pointer items-center gap-3'
                htmlFor={`filter-rarity-${rarity}`}
              >
                <input
                  id={`filter-rarity-${rarity}`}
                  type='checkbox'
                  checked={raritySet.has(rarity)}
                  onChange={(event) => toggleParam('rarity', rarity, event.target.checked)}
                  className='h-5 w-5 rounded border-[#535f73] text-[#bb001a] focus:ring-[#bb001a]'
                />
                <span className='text-base text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
                  {rarity}
                </span>
              </label>
            ))
          )}
        </div>
      </FilterCard>

      <FilterCard title='세트'>
        <div className='flex flex-col gap-3'>
          {availableSets.length === 0 ? (
            <p className='text-sm leading-[1.5] text-[#535f73]'>등록된 세트가 없습니다.</p>
          ) : (
            availableSets.map((set) => (
              <label
                key={set.slug}
                className='group flex cursor-pointer items-center gap-3'
                htmlFor={`filter-set-${set.slug}`}
              >
                <input
                  id={`filter-set-${set.slug}`}
                  type='checkbox'
                  checked={setSlugSet.has(set.slug)}
                  onChange={(event) => toggleParam('set', set.slug, event.target.checked)}
                  className='h-5 w-5 rounded border-[#535f73] text-[#bb001a] focus:ring-[#bb001a]'
                />
                <span className='text-base text-[#191c1e] transition-colors group-hover:text-[#bb001a]'>
                  {set.name}
                </span>
              </label>
            ))
          )}
        </div>
      </FilterCard>
    </aside>
  );
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm'>
      <h3 className='mb-4 text-xs font-semibold tracking-wider text-[#535f73] uppercase'>
        {title}
      </h3>
      {children}
    </div>
  );
}
