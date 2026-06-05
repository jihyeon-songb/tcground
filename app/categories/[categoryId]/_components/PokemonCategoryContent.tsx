import type { PokemonCategoryPageData } from '@/lib/tcg-catalog';
import type { CardView } from '../_lib/category-search-params';
import { CardResults } from './CardResults';
import { CategoryFilterBar } from './CategoryFilterBar';
import { CategoryResultsToolbar } from './CategoryResultsToolbar';
import { CategoryTabs } from './CategoryTabs';

interface PokemonCategoryContentProps {
  data: PokemonCategoryPageData | null;
  productsHref?: string;
  view?: CardView;
}

export function PokemonCategoryContent({
  data,
  productsHref = '/categories/pokemon',
  view = 'grid',
}: PokemonCategoryContentProps) {
  const cards = data?.cards ?? [];
  const query = data?.query ?? '';
  const hasQuery = query.length > 0;

  return (
    <>
      <CategoryTabs productsHref={productsHref} />

      <section className='mb-8 flex flex-col items-start gap-3'>
        <p className='text-sm leading-none font-bold tracking-wider text-tcg-red uppercase'>
          {data?.gameName ?? 'Pokemon TCG'}
        </p>
        <h1 className='text-3xl leading-[1.1] font-extrabold text-foreground md:text-4xl'>
          {data?.gameNameKo ?? '포켓몬 카드'}
        </h1>
        <p className='max-w-2xl text-base leading-[1.6] text-muted-foreground'>
          {data?.description ??
            '포켓몬 카드의 대표 한국판 카탈로그를 세트와 레어도 기준으로 탐색하세요.'}
        </p>
        {hasQuery ? (
          <SearchResultBanner query={query} resultCount={data?.totalCount ?? cards.length} />
        ) : null}
      </section>

      <CategoryFilterBar
        availableRarities={data?.availableRarities ?? []}
        availableSets={data?.availableSets ?? []}
        selectedRarities={data?.selectedRarities ?? []}
        selectedSetSlugs={data?.selectedSetSlugs ?? []}
      />

      <CategoryResultsToolbar
        totalCount={data?.totalCount ?? cards.length}
        sort={data?.sort ?? 'best'}
        view={view}
      />

      <CardResults
        initialCards={cards}
        totalCount={data?.totalCount ?? cards.length}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 24}
        sort={data?.sort ?? 'best'}
        query={query}
        rarities={data?.selectedRarities ?? []}
        setSlugs={data?.selectedSetSlugs ?? []}
        view={view}
      />
    </>
  );
}

function SearchResultBanner({ query, resultCount }: { query: string; resultCount: number }) {
  return (
    <div
      aria-live='polite'
      className='text-base leading-[1.5] font-bold text-foreground'
      data-testid='search-result-banner'
    >
      <span className='font-bold'>{`'${query}'`}</span>에 대한{' '}
      <span className='font-bold'>{resultCount}</span>개 결과
    </div>
  );
}
